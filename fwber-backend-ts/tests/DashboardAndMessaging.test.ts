import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Regression suite for v2.3.62:
// 1. GET /api/dashboard/stats must report `conversations: 0` and `match_score_avg: 0`
//    for fresh 0-activity accounts (never counting global seeded `chatrooms` or
//    fabricating `Math.round(completionPercentage * 0.8)`).
// 2. GET /api/matches/established must include accepted friends alongside accepted
//    matches, exclude bidirectional blocks, and hydrate `other_user.profile.photos`
//    + `last_message`.
// 3. POST /api/messages & GET /api/messages/:id must reject blocked users with 403
//    before creating messages or auto-creating matches.

(BigInt.prototype as any).toJSON = function () { return Number(this); };

const mockUsersFindUnique = jest.fn();
const mockUserProfilesFindFirst = jest.fn();
const mockPhotosCount = jest.fn();
const mockMatchesCount = jest.fn();
const mockMatchesFindMany = jest.fn();
const mockMatchesFindFirst = jest.fn();
const mockMatchesCreate = jest.fn();
const mockMatchesAggregate = jest.fn();
const mockProfileViewsCount = jest.fn();
const mockBlocksFindMany = jest.fn();
const mockBlocksFindFirst = jest.fn();
const mockFriendsFindMany = jest.fn();
const mockMessagesFindMany = jest.fn();
const mockMessagesFindFirst = jest.fn();
const mockMessagesCount = jest.fn();
const mockMessagesCreate = jest.fn();
const mockMessagesUpdateMany = jest.fn();
const mockChatroomsCount = jest.fn();

const mockPrisma = {
  users: { findUnique: mockUsersFindUnique },
  user_profiles: { findFirst: mockUserProfilesFindFirst },
  photos: { count: mockPhotosCount },
  matches: {
    count: mockMatchesCount,
    findMany: mockMatchesFindMany,
    findFirst: mockMatchesFindFirst,
    create: mockMatchesCreate,
    aggregate: mockMatchesAggregate,
  },
  profile_views: { count: mockProfileViewsCount },
  blocks: {
    findMany: mockBlocksFindMany,
    findFirst: mockBlocksFindFirst,
  },
  friends: { findMany: mockFriendsFindMany },
  messages: {
    findMany: mockMessagesFindMany,
    findFirst: mockMessagesFindFirst,
    count: mockMessagesCount,
    create: mockMessagesCreate,
    updateMany: mockMessagesUpdateMany,
  },
  chatrooms: { count: mockChatroomsCount },
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

jest.unstable_mockModule('../src/lib/achievements.js', () => ({
  checkAndUnlockAchievements: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../src/services/WingmanService.js', () => ({
  WingmanService: {
    analyzeAndNudge: jest.fn(async () => {}),
  },
}));

jest.unstable_mockModule('../src/services/MatchingHeuristicService.js', () => ({
  MatchingHeuristicService: class {
    async calculateConversationVibe() {
      return { vibe: 'warm', score: 80 };
    }
  },
}));

const { default: dashboardRoutes } = await import('../src/routes/dashboard.js');
const { default: matchesRoutes } = await import('../src/routes/matches.js');
const { default: messagesRoutes } = await import('../src/routes/messages.js');

const app = express();
app.use(express.json());
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  return next(err);
});
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/messages', messagesRoutes);

describe('Dashboard stats honesty (GET /api/dashboard/stats)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 conversations and 0% compatibility for a brand-new 0-activity account', async () => {
    mockUsersFindUnique.mockResolvedValue({
      id: 1n,
      created_at: new Date(),
      last_seen_at: new Date(),
      current_streak: 0,
      token_balance: 0,
    });
    mockUserProfilesFindFirst.mockResolvedValue({
      user_id: 1n,
      bio: 'Just joined fwber today!',
      date_of_birth: new Date('1998-05-01'),
    });
    mockPhotosCount.mockResolvedValue(0);
    mockMatchesCount.mockResolvedValue(0);
    mockProfileViewsCount.mockResolvedValue(0);
    mockBlocksFindMany.mockResolvedValue([]);
    mockMatchesFindMany.mockResolvedValue([]);
    mockFriendsFindMany.mockResolvedValue([]);
    mockMessagesFindMany.mockResolvedValue([]);
    mockMessagesCount.mockResolvedValue(0);
    mockChatroomsCount.mockResolvedValue(7); // 7 global seeded chatrooms must NOT be counted!

    const res = await request(app).get('/api/dashboard/stats');

    expect(res.status).toBe(200);
    expect(res.body.conversations).toBe(0);
    expect(res.body.match_score_avg).toBe(0);
    expect(res.body.total_matches).toBe(0);
    expect(mockChatroomsCount).not.toHaveBeenCalled();
  });

  it('counts distinct unblocked match + friend partners and aggregates real match_score', async () => {
    mockUsersFindUnique.mockResolvedValue({ id: 1n, created_at: new Date(), current_streak: 2, token_balance: 50 });
    mockUserProfilesFindFirst.mockResolvedValue({ user_id: 1n, bio: 'Active user profile text' });
    mockPhotosCount.mockResolvedValue(3);
    mockMatchesCount
      .mockResolvedValueOnce(2) // totalMatches
      .mockResolvedValueOnce(0) // pendingMatches
      .mockResolvedValueOnce(2); // acceptedMatches
    mockProfileViewsCount.mockResolvedValue(4);
    mockBlocksFindMany.mockResolvedValue([{ blocker_id: 1n, blocked_id: 9n }]);
    mockMatchesFindMany.mockResolvedValue([
      { user1_id: 1n, user2_id: 2n },
      { user1_id: 9n, user2_id: 1n }, // blocked partner must be excluded
    ]);
    mockFriendsFindMany.mockResolvedValue([
      { user_id: 1n, friend_id: 2n }, // duplicate of match partner #2 -> deduplicated
      { user_id: 3n, friend_id: 1n }, // distinct friend #3
    ]);
    mockMessagesFindMany.mockResolvedValue([
      { sender_id: 1n, receiver_id: 4n }, // distinct DM partner #4
    ]);
    mockMatchesAggregate.mockResolvedValue({ _avg: { match_score: 84.4 } });
    mockMessagesCount.mockResolvedValue(5);

    const res = await request(app).get('/api/dashboard/stats');

    expect(res.status).toBe(200);
    expect(res.body.conversations).toBe(3); // partners 2, 3, 4 (partner 9 excluded by block)
    expect(res.body.match_score_avg).toBe(84);
  });
});

describe('Established conversations (GET /api/matches/established)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes accepted friends, hydrates profile photos + last_message, and excludes blocked users', async () => {
    mockBlocksFindMany.mockResolvedValue([{ blocker_id: 8n, blocked_id: 1n }]);
    mockMatchesFindMany.mockResolvedValue([
      {
        id: 11n,
        user1_id: 1n,
        user2_id: 2n,
        status: 'accepted',
        is_active: true,
        match_score: 91,
        created_at: new Date('2026-11-10T00:00:00Z'),
        last_message_at: new Date('2026-11-11T00:00:00Z'),
        users_matches_user1_idTousers: { id: 1n, name: 'Me', user_profiles: [], photos: [] },
        users_matches_user2_idTousers: {
          id: 2n,
          name: 'Match Partner',
          email: 'match@example.com',
          user_profiles: [{ display_name: 'Match Partner', avatar_url: 'https://cdn.example/a.jpg', current_emotion: 'happy' }],
          photos: [],
        },
      },
      {
        id: 12n,
        user1_id: 1n,
        user2_id: 8n, // blocked!
        status: 'accepted',
        is_active: true,
        match_score: 50,
        created_at: new Date('2026-11-10T00:00:00Z'),
        last_message_at: null,
        users_matches_user1_idTousers: { id: 1n, name: 'Me', user_profiles: [], photos: [] },
        users_matches_user2_idTousers: { id: 8n, name: 'Blocked User', user_profiles: [], photos: [] },
      },
    ]);
    mockFriendsFindMany.mockResolvedValue([
      {
        id: 25n,
        user_id: 3n,
        friend_id: 1n,
        status: 'accepted',
        created_at: new Date('2026-11-12T00:00:00Z'),
        users_friends_user_idTousers: {
          id: 3n,
          name: 'Accepted Friend',
          email: 'friend@example.com',
          user_profiles: [{ display_name: 'Accepted Friend', avatar_url: 'https://cdn.example/f.jpg', current_emotion: 'excited' }],
          photos: [],
        },
        users_friends_friend_idTousers: { id: 1n, name: 'Me', user_profiles: [], photos: [] },
      },
    ]);
    mockMessagesFindFirst.mockImplementation(async (args: any) => {
      const clauses = args.where.OR;
      const involvesTwo = clauses.some((c: any) => c.receiver_id === 2n || c.sender_id === 2n);
      if (involvesTwo) {
        return {
          id: 99n,
          sender_id: 2n,
          receiver_id: 1n,
          content: 'Hey there!',
          message_type: 'text',
          sent_at: new Date('2026-11-12T10:00:00Z'),
          is_read: false,
        };
      }
      return null;
    });

    const res = await request(app).get('/api/matches/established');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const partnerIds = res.body.data.map((d: any) => d.other_user.id);
    expect(partnerIds).toEqual([2, 3]); // blocked user 8 excluded; match 2 has newer last_message than friend 3
    expect(res.body.data[0].last_message.content).toBe('Hey there!');
    expect(res.body.data[0].other_user.profile.photos).toHaveLength(1);
    expect(res.body.data[1].relationship_type).toBe('friend');
    expect(res.body.data[1].other_user.profile.display_name).toBe('Accepted Friend');
  });
});

describe('Block enforcement in messaging & malformed JSON guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects POST /api/messages with 403 when blocked in either direction', async () => {
    mockBlocksFindFirst.mockResolvedValue({ id: 77n, blocker_id: 5n, blocked_id: 1n });

    const res = await request(app)
      .post('/api/messages')
      .send({ receiver_id: 5, content: 'Trying to bypass block' });

    expect(res.status).toBe(403);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(mockMatchesCreate).not.toHaveBeenCalled();
  });

  it('rejects GET /api/messages/:id with 403 when blocked', async () => {
    mockBlocksFindFirst.mockResolvedValue({ id: 77n, blocker_id: 1n, blocked_id: 5n });

    const res = await request(app).get('/api/messages/5');

    expect(res.status).toBe(403);
    expect(mockMessagesFindMany).not.toHaveBeenCalled();
  });

  it('returns clean 400 JSON on malformed JSON body instead of unhandled SyntaxError', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Content-Type', 'application/json')
      .send('{"broken_json": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON payload' });
  });
});
