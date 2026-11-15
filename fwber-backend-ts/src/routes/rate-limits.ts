import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getRateLimiterStats } from '../lib/rateLimit.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/rate-limits/stats/:timeframe & GET /api/rate-limits/stats
 * Exposes sliding-window rate-limiter bucket telemetry for `/analytics` (`RateLimitStats.tsx`).
 */
router.get(['/stats/:timeframe', '/stats'], (req: any, res) => {
  const rawTf = String(req.params.timeframe || req.query.timeframe || '1h');
  const timeframe: '1h' | '24h' = rawTf === '24h' ? '24h' : '1h';
  return res.json(getRateLimiterStats(timeframe));
});

export default router;
