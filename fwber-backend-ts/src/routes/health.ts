import { Router } from 'express';
import os from 'os';
import prisma from '../lib/prisma.js';
import { getAppVersion } from '../lib/version.js';

const router = Router();

/**
 * GET /api/health
 *
 * Mounted at `/api/health` in src/index.ts. Previously `health.ts` only exposed
 * `GET /metrics`, causing `GET /api/health` (used by Next.js `/api/:path*`
 * rewrites, `tools/check_rewrites.py`, and external uptime monitors) to fall
 * through to the `app.use('/api', ...)` catch-all and return `200 []` even if
 * MySQL was completely unreachable.
 *
 * Executes a lightweight `SELECT 1` ping against Prisma's pool rather than a
 * table scan (`users.count()`), returning HTTP 200 when healthy or HTTP 503
 * when database connectivity fails, alongside the centralized `VERSION` tag.
 */
router.get('/', async (_req, res) => {
  const appVersion = getAppVersion();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      version: '2.0.0-ts',
      app_version: appVersion,
      uptime_seconds: Math.round(process.uptime()),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      version: '2.0.0-ts',
      app_version: appVersion,
    });
  }
});

/**
 * GET /api/health/metrics
 *
 * Detailed telemetry endpoint for dashboards and autonomous ops checks.
 * Returns HTTP 503 when database connectivity is degraded so upstream alerts
 * trigger accurately instead of masking DB outages behind HTTP 200.
 */
router.get('/metrics', async (_req, res) => {
  const start = Date.now();
  let dbStatus = 'connected';
  let dbLatencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch (error) {
    dbStatus = 'disconnected';
  }

  const memUsage = process.memoryUsage();
  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    version: '2.0.1-ts',
    app_version: getAppVersion(),
    database: {
      status: dbStatus,
      latency_ms: dbLatencyMs,
    },
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
    },
    system: {
      load_avg: os.loadavg(),
      free_mem_mb: Math.round(os.freemem() / 1024 / 1024),
      total_mem_mb: Math.round(os.totalmem() / 1024 / 1024),
    },
  });
});

export default router;
