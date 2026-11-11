import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Covers the 2026-11-06 QA-test fixes:
// - GET /api/friends/search did not exist (frontend 404'd, page always showed
//   "No users found"); it now returns matching users as a bare array.
// - POST /api/friends/requests must refuse requests across a block.
// - POST /api/blocks must sever friendships + pending requests, so a blocked
//   user disappears from the blocker's friends list.

const mockUsersFindMany = jest.fn();
const mockUsersFindUnique = jest.fn();
const mockFriendsFindMany = jest.fn();
const mockFriendsFindFirst = jest.fn();
const mockFriendsDeleteMany = jest.fn();
const mockFriendRequestsFindMany = jest.fn();
const mockFriendRequestsFindFirst = jest.fn();
const mockFriendRequestsCreate = jest.fn();
const mockFriendRequestsDeleteMany = jest.fn();
const mockBlocksFindMany = jest.fn();
const mockBlocksFindFirst = jest.fn();
const mockBlocksCreate = jest.fn();
const mockBlocksDeleteMany = jest.fn();
const mockUserMatchesDeleteMany = jest.fn();
const mockCreateNotification = jest.fn();
const mockCheckAchievements = jest.fn();

const mockPrisma = {
  users: { findMany: mockUsersFindMany, findUnique: mockUsersFindUnique },
  friends: {
    findMany: mockFriendsFindMany,
    findFirst: mockFriendsFindFirst,
    deleteMany: mockFriendsDeleteMany,
  },
  friend_requests: {
    findMany: mockFriendRequestsFindMany,
    findFirst: mockFriendRequestsFindFirst,
    create: mockFriendRequestsCreate,
    deleteMany: mockFriendRequestsDeleteMany,
  },
  blocks: {
    findMany: mockBlocksFindMany,
    findFirst: mockBlocksFindFirst,
    create: mockBlocksCreate,
    deleteMany: mockBlocksDeleteMany,
  },
  user_matches: { deleteMany: mockUserMatchesDeleteMany },
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

jest.unstable_mockModule('../src/routes/notifications.js', () => ({
  createNotification: mockCreateNotification,
}));

jest.unstable_mockModule('../src/lib/achievements.js', () => ({
  checkAndUnlockAchievements: mockCheckAchievements,
}));

const { default: friendsRoutes } = await import('../src/routes/friends.js');
const { default: blocksRoutes } = await import('../src/routes/blocks.js');

const app = express();
app.use(express.json());
app.use('/api/friends', friendsRoutes);
app.use('/api/blocks', blocksRoutes);

describe('Friends search (GET /api/friends/search)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlocksFindMany.mockResolvedValue([]);
    mockFriendsFindMany.mockResolvedValue([]);
    mockFriendRequestsFindMany.mockResolvedValue([]);
  });

  it('returns matching users as a bare array, excluding the caller', async () => {
    mockUsersFindMany.mockImplementation(async (args: any) => {
      // Caller (id 1) must be excluded
      expect(args.where.id.not).toBe(1n);
      // Text search across name / display_name / bio / occupation
      expect(args.where.OR.length).toBe(4);
      return [
        { id: 2n, name: 'FWBER QA Beta', user_profiles: [{ display_name: 'FWBER QA Beta', avatar_url: null }] },
      ];
    });

    const res = await request(app).get('/api/friends/search?q=Beta');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([
      { id: 2, name: 'FWBER QA Beta', display_name: 'FWBER QA Beta', avatar_url: null },
    ]);
  });

  it('excludes blocked users, friends, and pending requests from results', async () => {
    mockBlocksFindMany.mockResolvedValue([{ blocker_id: 1n, blocked_id: 3n }]);
    mockFriendsFindMany.mockResolvedValue([{ user_id: 1n, friend_id: 4n }]);
    mockFriendRequestsFindMany.mockResolvedValue([{ user_id: 5n, friend_id: 1n }]);
    mockUsersFindMany.mockImplementation(async (args: any) => {
      const notIn = (args.where.id.notIn as bigint[]).map(String).sort();
      expect(notIn).toEqual(['3', '4', '5']);
      return [];
    });

    const res = await request(app).get('/api/friends/search?q=FWBER');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns [] for an empty query', async () => {
    const res = await request(app).get('/api/friends/search?q=');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockUsersFindMany).not.toHaveBeenCalled();
  });
});

describe('Friend requests across a block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses a request when either side blocked the other', async () => {
    mockUsersFindUnique.mockResolvedValue({ id: 5n });
    mockBlocksFindFirst.mockResolvedValue({ id: 9n, blocker_id: 5n, blocked_id: 1n });

    const res = await request(app)
      .post('/api/friends/requests')
      .send({ friend_id: 5 });

    expect(res.status).toBe(400);
    expect(mockFriendRequestsCreate).not.toHaveBeenCalled();
  });

  it('sends the request when no block exists', async () => {
    mockUsersFindUnique.mockResolvedValue({ id: 5n, name: 'FWBER QA Beta' });
    mockBlocksFindFirst.mockResolvedValue(null);
    mockFriendsFindFirst.mockResolvedValue(null);
    mockFriendRequestsFindFirst.mockResolvedValue(null);
    mockFriendRequestsCreate.mockResolvedValue({ id: 7n });

    const res = await request(app)
      .post('/api/friends/requests')
      .send({ friend_id: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockFriendRequestsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: 1n, friend_id: 5n, status: 'pending' }),
      })
    );
  });
});

describe('Blocking (POST /api/blocks)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('severs friendship and pending requests when blocking', async () => {
    mockBlocksFindFirst.mockResolvedValue(null);
    mockBlocksCreate.mockResolvedValue({ id: 3n });
    mockFriendsDeleteMany.mockResolvedValue({ count: 1 });
    mockFriendRequestsDeleteMany.mockResolvedValue({ count: 1 });
    mockUserMatchesDeleteMany.mockResolvedValue({ count: 0 });

    const res = await request(app).post('/api/blocks').send({ user_id: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'User blocked', blocked: true });
    expect(mockFriendsDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { user_id: 1n, friend_id: 5n },
            { user_id: 5n, friend_id: 1n },
          ],
        }),
      })
    );
    expect(mockFriendRequestsDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      })
    );
  });

  it('refuses to block yourself', async () => {
    const res = await request(app).post('/api/blocks').send({ user_id: 1 });

    expect(res.status).toBe(400);
    expect(mockBlocksCreate).not.toHaveBeenCalled();
  });

  it('unblocks via DELETE /api/blocks/:userId', async () => {
    mockBlocksDeleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app).delete('/api/blocks/5');

    expect(res.status).toBe(200);
    expect(res.body.unblocked).toBe(true);
  });
});
