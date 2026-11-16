import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Pillar 5 — No Rejection State (VISION 2026-11-16): fwber has NO friend
// requests. Interest is unilateral + private; only mutual interest unlocks
// a connection (and only then notifies). These tests pin the contract:
// silent one-way interest, mutual unlock, silent withdraw, 410 tombs for
// the retired request/accept/reject flows, and grandfathered connections.

type Row = { id: bigint; user_id: bigint; friend_id: bigint; status: string };
let interestRows: Row[] = [];
let friendRows: Row[] = [];
let rowSeq = 1n;

const key = (a: bigint, b: bigint, s: string) => `${a}:${b}:${s}`;

const mockFriendRequests = {
  findFirst: jest.fn(async (args: any) => {
    const w = args.where;
    return interestRows.find(
      (r) => r.user_id === w.user_id && r.friend_id === w.friend_id && r.status === w.status,
    ) ?? null;
  }),
  findMany: jest.fn(async (args: any) => {
    const w = args.where || {};
    return interestRows.filter((r) => {
      if (w.user_id !== undefined && r.user_id !== w.user_id) return false;
      if (w.status !== undefined && r.status !== w.status) return false;
      return true;
    });
  }),
  create: jest.fn(async (args: any) => {
    const row: Row = { id: rowSeq++, user_id: args.data.user_id, friend_id: args.data.friend_id, status: args.data.status };
    interestRows.push(row);
    return row;
  }),
  deleteMany: jest.fn(async (args: any) => {
    const w = args.where;
    const before = interestRows.length;
    interestRows = interestRows.filter(
      (r) => !(r.user_id === w.user_id && r.friend_id === w.friend_id && r.status === w.status),
    );
    return { count: before - interestRows.length };
  }),
};

const mockFriends = {
  findFirst: jest.fn(async (args: any) => {
    const ors = args.where.OR || [];
    return friendRows.find(
      (r) =>
        r.status === args.where.status &&
        ors.some((o: any) => r.user_id === o.user_id && r.friend_id === o.friend_id),
    ) ?? null;
  }),
  findMany: jest.fn(async (args: any) => {
    const w = args.where || {};
    return friendRows.filter((r) => {
      if (w.status && r.status !== w.status) return false;
      if (w.OR) {
        return w.OR.some(
          (o: any) =>
            (o.user_id === undefined || r.user_id === o.user_id) &&
            (o.friend_id === undefined || r.friend_id === o.friend_id),
        );
      }
      return true;
    }).map((r) => ({
      ...r,
      users_friends_user_idTousers: { id: r.user_id, name: 'User' + r.user_id, user_profiles: [] },
      users_friends_friend_idTousers: { id: r.friend_id, name: 'User' + r.friend_id, user_profiles: [] },
    }));
  }),
  create: jest.fn(async (args: any) => {
    const row: Row = { id: rowSeq++, user_id: args.data.user_id, friend_id: args.data.friend_id, status: args.data.status };
    friendRows.push(row);
    return row;
  }),
  deleteMany: jest.fn(async () => ({ count: 0 })),
};

const mockUsersFindUnique = jest.fn(async (args: any) => ({ id: args.where.id, name: 'User' + args.where.id }));
const mockBlocksFindFirst = jest.fn(async () => null);
const mockCreateNotification = jest.fn(async () => ({}));

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    friend_requests: mockFriendRequests,
    friends: mockFriends,
    users: { findUnique: mockUsersFindUnique, findMany: jest.fn(async () => []) },
    blocks: { findFirst: mockBlocksFindFirst, findMany: jest.fn(async () => []) },
  },
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: Number(req.headers['x-test-user'] || 1) };
    next();
  },
}));

jest.unstable_mockModule('../src/routes/notifications.js', () => ({
  createNotification: mockCreateNotification,
}));

jest.unstable_mockModule('../src/lib/achievements.js', () => ({
  checkAndUnlockAchievements: jest.fn(async () => {}),
}));

const { default: friendsRoutes } = await import('../src/routes/friends.js');

const app = express();
app.use(express.json());
app.use('/api/friends', friendsRoutes);

const as = (id: number) => ({ 'x-test-user': String(id) });

beforeEach(() => {
  interestRows = [];
  friendRows = [];
  jest.clearAllMocks();
  // clearAllMocks wipes implementations; re-establish the store-backed ones
  mockFriendRequests.findFirst.mockImplementation(async (args: any) => {
    const w = args.where;
    return interestRows.find((r) => r.user_id === w.user_id && r.friend_id === w.friend_id && r.status === w.status) ?? null;
  });
});

describe('Pillar 5 interest contract', () => {
  it('one-way interest is silent: no notification, invisible to the target', async () => {
    const res = await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 2 });
    expect(res.status).toBe(200);
    expect(res.body.mutual).toBe(false);
    expect(mockCreateNotification).not.toHaveBeenCalled();

    // Target sees no pending state, ever
    const reqs = await request(app).get('/api/friends/requests').set(as(2));
    expect(reqs.body.data).toEqual([]);

    // Target's own interest list does not reveal the admirer
    const theirs = await request(app).get('/api/friends/interests').set(as(2));
    expect(theirs.body.data).toEqual([]);
  });

  it('mutual interest unlocks the connection and notifies BOTH sides once', async () => {
    await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 2 });
    const res = await request(app).post('/api/friends/interest').set(as(2)).send({ friend_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.mutual).toBe(true);
    expect(friendRows.some((r) => r.status === 'accepted')).toBe(true);
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);

    const friends = await request(app).get('/api/friends').set(as(1));
    expect(JSON.stringify(friends.body)).toContain('"id":2');
  });

  it('expressing interest twice is idempotent (one row, no extra notify)', async () => {
    await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 2 });
    const again = await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 2 });
    expect(again.status).toBe(200);
    expect(interestRows.filter((r) => r.status === 'interested').length).toBe(1);
  });

  it('withdraw is silent and removes the interest', async () => {
    await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 2 });
    const res = await request(app).delete('/api/friends/interest/2').set(as(1));
    expect(res.status).toBe(200);
    expect(interestRows.length).toBe(0);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('rejects self-interest (400), unknown users (404), and blocked pairs (400)', async () => {
    expect((await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 1 })).status).toBe(400);

    mockUsersFindUnique.mockResolvedValueOnce(null as any);
    expect((await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 99 })).status).toBe(404);

    mockBlocksFindFirst.mockResolvedValueOnce({ id: 1n } as any);
    expect((await request(app).post('/api/friends/interest').set(as(1)).send({ friend_id: 2 })).status).toBe(400);
  });

  it('retired request flows answer 410 FRIEND_REQUESTS_REMOVED', async () => {
    for (const [method, path] of [
      ['post', '/api/friends/request'],
      ['post', '/api/friends/requests'],
      ['post', '/api/friends/requests/2'],
      ['post', '/api/friends/accept/1'],
      ['post', '/api/friends/reject/1'],
    ] as const) {
      const res = await (request(app) as any)[method](path).set(as(1)).send({ friend_id: 2, status: 'accepted' });
      expect(res.status).toBe(410);
      expect(res.body.code).toBe('FRIEND_REQUESTS_REMOVED');
    }
  });

  it('grandfathered accepted friendships still list as connections', async () => {
    friendRows.push({ id: 50n, user_id: 3n, friend_id: 1n, status: 'accepted' });
    const friends = await request(app).get('/api/friends').set(as(1));
    expect(JSON.stringify(friends.body)).toContain('"id":3');
  });
});
