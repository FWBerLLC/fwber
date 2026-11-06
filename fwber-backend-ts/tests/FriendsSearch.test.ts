import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Regression test for the dead friend-request flow found on production
// (2026-11-06 Bobbi visual test): the Friends page calls
// GET /api/friends/search, but the backend never implemented it, so every
// user search came back empty. This pins the endpoint's contract:
// data: [{ id, name, display_name, avatar_url }], self excluded, blank
// query short-circuits without touching the database.

const mockFindMany = jest.fn();

const mockPrisma = {
  users: { findMany: mockFindMany },
  friends: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
  friend_requests: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
  createNotification: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../src/lib/achievements.js', () => ({
  checkAndUnlockAchievements: jest.fn(async () => {}),
}));

const { default: friendsRoutes } = await import('../src/routes/friends.js');

const app = express();
app.use(express.json());
app.use('/api/friends', friendsRoutes);

describe('GET /api/friends/search (Isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns matching users mapped to the FriendUser shape', async () => {
    mockFindMany.mockResolvedValue([
      { id: 189n, name: 'FWBER QA Beta', user_profiles: [{ display_name: 'Beta', avatar_url: 'https://x/y.png' }] },
      { id: 190n, name: 'Beta NoProfile', user_profiles: [] },
    ]);

    const res = await request(app).get('/api/friends/search?q=Beta');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: 189, name: 'FWBER QA Beta', display_name: 'Beta', avatar_url: 'https://x/y.png' },
      { id: 190, name: 'Beta NoProfile', display_name: 'Beta NoProfile', avatar_url: null },
    ]);
    // Self-exclusion is part of the contract: never offer yourself as a friend.
    expect(mockFindMany.mock.calls[0][0].where.id).toEqual({ not: 1n });
  });

  it('returns an empty list for a blank query without querying', async () => {
    const res = await request(app).get('/api/friends/search?q=%20%20');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
