import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Inbound WebFinger discovery (RFC 7033): remote Mastodon/Pleroma servers
// resolve @user@api.fwber.online by querying
//   GET /.well-known/webfinger?resource=acct:user@api.fwber.online
// and following the rel="self" application/activity+json link to our actor
// document. fwber implemented outbound resolution (resolveWebFinger) but
// never served the inbound endpoint, so remote servers could not discover
// fwber users at all. These tests pin the JRD contract they expect.

const mockUsersFindFirst = jest.fn();

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    users: {
      findFirst: mockUsersFindFirst,
    },
  },
}));

const { default: webfingerRoutes } = await import('../src/routes/webfinger.js');

function buildApp() {
  const app = express();
  app.use('/.well-known', webfingerRoutes);
  return app;
}

describe('GET /.well-known/webfinger (inbound discovery)', () => {
  beforeEach(() => {
    mockUsersFindFirst.mockReset();
  });

  it('returns a Mastodon-compatible JRD for a known user', async () => {
    mockUsersFindFirst.mockResolvedValue({ id: 42n, name: 'ada' });

    const res = await request(buildApp())
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:ada@api.fwber.online' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/jrd\+json/);
    expect(res.body.subject).toBe('acct:ada@api.fwber.online');
    const self = (res.body.links || []).find((l: any) => l.rel === 'self');
    expect(self).toBeDefined();
    expect(self.type).toBe('application/activity+json');
    expect(self.href).toBe('https://api.fwber.online/api/federation/actors/42');
  });

  it('resolves handles case-insensitively', async () => {
    mockUsersFindFirst.mockResolvedValue({ id: 42n, name: 'ada' });

    const res = await request(buildApp())
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:Ada@api.fwber.online' });

    expect(res.status).toBe(200);
    expect(mockUsersFindFirst).toHaveBeenCalled();
    const arg = mockUsersFindFirst.mock.calls[0][0] as any;
    // Case-insensitivity comes from the MySQL collation at query time;
    // the route must pass the handle through unmodified.
    expect(arg.where.name.equals).toBe('Ada');
  });

  it('404s for an unknown user', async () => {
    mockUsersFindFirst.mockResolvedValue(null);

    const res = await request(buildApp())
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:ghost@api.fwber.online' });

    expect(res.status).toBe(404);
  });

  it('404s for a handle on a foreign domain', async () => {
    const res = await request(buildApp())
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:ada@mastodon.social' });

    expect(res.status).toBe(404);
    expect(mockUsersFindFirst).not.toHaveBeenCalled();
  });

  it('400s when resource is missing or malformed', async () => {
    const app = buildApp();
    expect((await request(app).get('/.well-known/webfinger')).status).toBe(400);
    expect((await request(app).get('/.well-known/webfinger').query({ resource: 'ada' })).status).toBe(400);
    expect((await request(app).get('/.well-known/webfinger').query({ resource: 'https://example.com/users/ada' })).status).toBe(400);
  });
});
