import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// PUT /settings/privacy honesty: only is_incognito / is_travel_mode are
// stored. The old handler echoed every submitted key as "updated",
// silently dropping the rest. Response now splits updated vs ignored.

(BigInt.prototype as any).toJSON = function () { return Number(this); };

let stored: any = { is_incognito: false, is_travel_mode: false };
const mockUpdateMany = jest.fn(async (args: any) => { Object.assign(stored, args.data); return { count: 1 }; });

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    user_profiles: {
      findFirst: jest.fn(async () => ({ journal_circle_group_id: null, journal_default_visibility: 'private', is_incognito: stored.is_incognito, is_travel_mode: stored.is_travel_mode, is_federated: false })),
      updateMany: mockUpdateMany,
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
    },
    group_members: { findMany: jest.fn(async () => []) },
    users: { findUnique: jest.fn(async () => null) },
  },
  serialize: (v: any) => v,
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: settingsRoutes } = await import('../src/routes/settings.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/settings', settingsRoutes);
  return app;
}

describe('PUT /api/settings/privacy', () => {
  beforeEach(() => { stored = { is_incognito: false, is_travel_mode: false }; mockUpdateMany.mockClear(); });

  it('persists stored fields and round-trips through GET', async () => {
    const put = await request(buildApp()).put('/api/settings/privacy').send({ is_incognito: true });
    expect(put.status).toBe(200);
    expect(put.body.updated).toEqual(['is_incognito']);
    const get = await request(buildApp()).get('/api/settings/privacy');
    expect(get.body.is_incognito).toBe(true);
  });

  it('reports unaccepted fields as ignored, never as updated', async () => {
    const put = await request(buildApp())
      .put('/api/settings/privacy')
      .send({ is_travel_mode: true, show_online_status: false, show_distance: false });
    expect(put.status).toBe(200);
    expect(put.body.updated).toEqual(['is_travel_mode']);
    expect(put.body.ignored).toEqual(['show_online_status', 'show_distance']);
  });
});
