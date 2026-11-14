import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

const mockQueryRaw = jest.fn();

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    $queryRaw: mockQueryRaw,
  },
}));

const { default: healthRoutes } = await import('../src/routes/health.js');
const { getAppVersion } = await import('../src/lib/version.js');

function buildApp() {
  const app = express();
  app.use('/api/health', healthRoutes);
  // Mirror src/index.ts catch-all so we prove GET /api/health never falls through to 200 []
  app.use('/api', (_req, res) => {
    res.json([]);
  });
  return app;
}

describe('Health & Version Endpoints (/api/health)', () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  it('reads a valid semver string from centralized VERSION via getAppVersion()', () => {
    const version = getAppVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('GET /api/health returns 200 JSON object with DB check and app_version (not catch-all [])', async () => {
    mockQueryRaw.mockResolvedValue([{ '1': 1 }]);

    const res = await request(buildApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.version).toBe('2.0.0-ts');
    expect(res.body.app_version).toBe(getAppVersion());
    expect(typeof res.body.uptime_seconds).toBe('number');
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it('GET /api/health returns 503 when MySQL connectivity fails', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

    const res = await request(buildApp()).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.database).toBe('disconnected');
    expect(res.body.app_version).toBe(getAppVersion());
  });

  it('GET /api/health/metrics returns 200 when healthy and 503 when degraded', async () => {
    const app = buildApp();

    mockQueryRaw.mockResolvedValueOnce([{ '1': 1 }]);
    const okRes = await request(app).get('/api/health/metrics');
    expect(okRes.status).toBe(200);
    expect(okRes.body.status).toBe('healthy');
    expect(okRes.body.database.status).toBe('connected');
    expect(okRes.body.app_version).toBe(getAppVersion());

    mockQueryRaw.mockRejectedValueOnce(new Error('Pool timeout'));
    const failRes = await request(app).get('/api/health/metrics');
    expect(failRes.status).toBe(503);
    expect(failRes.body.status).toBe('degraded');
    expect(failRes.body.database.status).toBe('disconnected');
    expect(failRes.body.app_version).toBe(getAppVersion());
  });
});
