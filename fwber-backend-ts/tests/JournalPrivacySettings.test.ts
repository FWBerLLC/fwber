import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Journal privacy persistence: PUT previously echoed the request body
// without saving (and hardcoded circle group 1), so no visibility ever
// survived a re-read. Both handlers now round-trip the real profile
// columns, PUT returns re-read state, and bad values 400.

(BigInt.prototype as any).toJSON = function () { return Number(this); };

let profile: any = { id: 7n, journal_circle_group_id: null, journal_default_visibility: 'private' };
const mockFindFirst = jest.fn(async () => profile);
const mockUpdate = jest.fn(async (args: any) => { Object.assign(profile, args.data); return profile; });
const mockCreate = jest.fn(async (args: any) => { profile = { id: 7n, ...args.data }; return profile; });

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    user_profiles: { findFirst: mockFindFirst, update: mockUpdate, create: mockCreate, findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    group_members: { findMany: jest.fn(async () => [{ groups: { id: 3n, name: 'Inner Circle', privacy: 'private' } }]) },
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

describe('/api/settings/privacy/journals', () => {
  beforeEach(() => {
    profile = { id: 7n, journal_circle_group_id: null, journal_default_visibility: 'private' };
    mockUpdate.mockClear(); mockCreate.mockClear();
  });

  it('round-trips friends visibility and circle group through storage', async () => {
    const put = await request(buildApp())
      .put('/api/settings/privacy/journals')
      .send({ default_visibility: 'circle', circle_group_id: 3 });
    expect(put.status).toBe(200);
    expect(put.body.data.default_visibility).toBe('circle');
    expect(put.body.data.circle_group_id).toBe(3);
    expect(put.body.data.available_groups).toEqual([{ id: 3, name: 'Inner Circle', privacy: 'private' }]);

    const get = await request(buildApp()).get('/api/settings/privacy/journals');
    expect(get.body.data.default_visibility).toBe('circle');
    expect(get.body.data.circle_group_id).toBe(3);
  });

  it('persists friends (previously impossible: only circle/private derivable)', async () => {
    const put = await request(buildApp())
      .put('/api/settings/privacy/journals')
      .send({ default_visibility: 'friends', circle_group_id: null });
    expect(put.status).toBe(200);
    const get = await request(buildApp()).get('/api/settings/privacy/journals');
    expect(get.body.data.default_visibility).toBe('friends');
    expect(get.body.data.circle_group_id).toBeNull();
  });

  it('rejects an invalid visibility with 400 and writes nothing', async () => {
    const res = await request(buildApp())
      .put('/api/settings/privacy/journals')
      .send({ default_visibility: 'everyone' });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
