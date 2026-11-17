import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Mirror src/index.ts bootstrap: BigInt serializes as Number in responses.
(BigInt.prototype as any).toJSON = function () { return Number(this); };

// Quest accept contract: accepting a nonexistent quest used to 500 on
// the user_quests foreign-key constraint. Missing quest -> 404, malformed
// id -> 400, existing quest -> upsert proceeds.

let questExists = true;
const mockUpsert = jest.fn(async (args: any) => ({ id: 9n, ...args.create, user_quests: undefined }));
const mockFindUnique = jest.fn(async () => (questExists ? { id: 5n, title: 'Battery Quest' } : null));

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    quests: { findUnique: mockFindUnique, findMany: jest.fn(async () => []) },
    user_quests: { upsert: mockUpsert, findUnique: jest.fn(async () => null) },
    user_profiles: { findFirst: jest.fn(async () => null) },
    user_locations: { findFirst: jest.fn(async () => null) },
  },
  serialize: (v: any) => v,
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));
jest.unstable_mockModule('../src/services/TokenDistributionService.js', () => ({
  TokenDistributionService: class { async awardTokens() { return true; } },
}));
jest.unstable_mockModule('../src/services/VibePromotionService.js', () => ({
  VibePromotionService: { generateContextualQuest: async () => null },
}));

const { default: questsRoutes } = await import('../src/routes/quests.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/quests', questsRoutes);
  return app;
}

describe('POST /api/quests/:id/accept', () => {
  beforeEach(() => { mockUpsert.mockClear(); mockFindUnique.mockClear(); questExists = true; });

  it('accepts an existing quest', async () => {
    const res = await request(buildApp()).post('/api/quests/5/accept').send({});
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('404s a nonexistent quest without upserting', async () => {
    questExists = false;
    const res = await request(buildApp()).post('/api/quests/999999/accept').send({});
    expect(res.status).toBe(404);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('400s a malformed quest id', async () => {
    const res = await request(buildApp()).post('/api/quests/abc/accept').send({});
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
