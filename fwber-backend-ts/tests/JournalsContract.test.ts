import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Journals contract: storage is a real journal_entries model and the
// router serves the exact frontend shapes ({ journals: [...] } list,
// { journal } create/update with visibility_label/tags/circle_group/
// can_edit). Legacy mood/is_private writes still map onto visibility.

(BigInt.prototype as any).toJSON = function () { return Number(this); };

let rows: any[] = [];
let seq = 1n;
const mockCreate = jest.fn(async (args: any) => {
  const row = { id: seq++, created_at: new Date(), updated_at: new Date(), ...args.data };
  rows.push(row);
  return row;
});
const mockFindMany = jest.fn(async (args: any) => rows.filter((r) => r.user_id === args.where.user_id));
const mockFindFirst = jest.fn(async (args: any) => rows.find((r) => r.id === args.where.id && r.user_id === args.where.user_id) ?? null);
const mockUpdate = jest.fn(async (args: any) => {
  const row = rows.find((r) => r.id === args.where.id);
  Object.assign(row, args.data);
  return row;
});
const mockDelete = jest.fn(async (args: any) => {
  rows = rows.filter((r) => r.id !== args.where.id);
  return {};
});

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    journal_entries: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, update: mockUpdate, delete: mockDelete },
    groups: { findMany: jest.fn(async () => []) },
  },
}));
jest.unstable_mockModule('../src/lib/achievements.js', () => ({
  checkAndUnlockAchievements: async () => {},
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: journalsRoutes } = await import('../src/routes/journals.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/journals', journalsRoutes);
  return app;
}

describe('/api/journals contract', () => {
  beforeEach(() => { rows = []; seq = 1n; mockCreate.mockClear(); });

  it('creates with the frontend shape and lists it back', async () => {
    const create = await request(buildApp())
      .post('/api/journals')
      .send({ title: 'Field note', content: 'dear diary', visibility: 'friends', tags: ['a', 'b'], mood_emoji: '🌙', accent_color: '#a855f7' });
    expect(create.status).toBe(201);
    expect(create.body.journal.title).toBe('Field note');
    expect(create.body.journal.visibility).toBe('friends');
    expect(create.body.journal.visibility_label).toBe('Friends');
    expect(create.body.journal.tags).toEqual(['a', 'b']);
    expect(create.body.journal.can_edit).toBe(true);

    const list = await request(buildApp()).get('/api/journals');
    expect(list.status).toBe(200);
    expect(list.body.journals).toHaveLength(1);
    expect(list.body.journals[0].content).toBe('dear diary');
  });

  it('maps legacy is_private writes onto visibility', async () => {
    const create = await request(buildApp()).post('/api/journals').send({ content: 'legacy', is_private: false });
    expect(create.status).toBe(201);
    expect(create.body.journal.visibility).toBe('public');
  });

  it('requires content', async () => {
    const res = await request(buildApp()).post('/api/journals').send({ title: 'no body' });
    expect(res.status).toBe(400);
  });

  it('updates and deletes only existing entries; bogus ids 404/400', async () => {
    await request(buildApp()).post('/api/journals').send({ content: 'v1' });
    const upd = await request(buildApp()).put('/api/journals/1').send({ content: 'v2' });
    expect(upd.status).toBe(200);
    expect(upd.body.journal.content).toBe('v2');

    const del = await request(buildApp()).delete('/api/journals/1');
    expect(del.status).toBe(200);
    const list = await request(buildApp()).get('/api/journals');
    expect(list.body.journals).toHaveLength(0);

    const missing = await request(buildApp()).delete('/api/journals/999');
    expect(missing.status).toBe(404);
    const malformed = await request(buildApp()).delete('/api/journals/abc');
    expect(malformed.status).toBe(400);
  });
});
