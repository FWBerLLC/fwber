import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// QA cleanup safeguards: moderators only, targets derive ONLY from the
// qa-*@example.com battery pattern (caller cannot supply ids), admins and
// the caller are always excluded, dry run is the default, and deletion
// requires an explicit confirm.

(BigInt.prototype as any).toJSON = function () { return Number(this); };

let callerIsModerator = true;
const USERS = [
  { id: 1n, email: 'qa-battery-a@example.com', is_moderator: false, role: 'user' },
  { id: 2n, email: 'qa-flow-b@example.com', is_moderator: false, role: 'user' },
  { id: 3n, email: 'real.person@example.com', is_moderator: false, role: 'user' },
  { id: 4n, email: 'qa-admin@example.com', is_moderator: true, role: 'user' },
  { id: 5n, email: 'qa-boss@example.com', is_moderator: false, role: 'admin' },
  { id: 42n, email: 'qa-caller@example.com', is_moderator: true, role: 'user' },
  { id: 6n, email: 'qa-other@gmail.com', is_moderator: false, role: 'user' },
];
const mockDeleteMany = jest.fn(async (args: any) => ({ count: args.where.id.in.length }));

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    users: {
      findUnique: jest.fn(async () => ({ is_moderator: callerIsModerator, role: 'user' })),
      findMany: jest.fn(async () => USERS),
      deleteMany: mockDeleteMany,
    },
  },
  serialize: (v: any) => v,
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: moderationRoutes } = await import('../src/routes/moderation.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/moderation', moderationRoutes);
  return app;
}

describe('POST /api/moderation/qa-cleanup', () => {
  beforeEach(() => { mockDeleteMany.mockClear(); callerIsModerator = true; });

  it('dry-runs by default and matches only battery-pattern non-admin accounts', async () => {
    const res = await request(buildApp()).post('/api/moderation/qa-cleanup').send({});
    expect(res.status).toBe(200);
    expect(res.body.dry_run).toBe(true);
    expect(res.body.matched).toBe(2);
    expect(res.body.emails).toEqual(['qa-battery-a@example.com', 'qa-flow-b@example.com']);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('deletes exactly the matched batch on confirm', async () => {
    const res = await request(buildApp()).post('/api/moderation/qa-cleanup').send({ confirm: true });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);
    const where = (mockDeleteMany.mock.calls[0] as any)[0].where;
    expect(where.id.in).toEqual([1n, 2n]);
  });

  it('never targets the caller even when the caller matches the pattern', async () => {
    const res = await request(buildApp()).post('/api/moderation/qa-cleanup').send({});
    expect(res.body.emails).not.toContain('qa-caller@example.com');
  });

  it('rejects non-moderators', async () => {
    callerIsModerator = false;
    const res = await request(buildApp()).post('/api/moderation/qa-cleanup').send({ confirm: true });
    expect(res.status).toBe(403);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });
});
