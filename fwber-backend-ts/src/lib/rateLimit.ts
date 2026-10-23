/**
 * Zero-dependency sliding-window rate limiter (v2.3.40).
 *
 * WHY NOT a package: the auth endpoints had NO brute-force protection at all,
 * and adding express-rate-limit means an npm install on a network/lockfile
 * that has been flaky in this project's history. This is ~80 lines, has no
 * dependency surface, and is fully testable.
 *
 * SCOPE & LIMITATIONS (deliberate, documented):
 * - In-memory per process. The backend runs as a single PM2 fork today, so
 *   this is exact. If the backend is ever clustered, move to a shared store
 *   (Redis) — the middleware signature is already isolated for that swap.
 * - Keyed by client IP, resolved via `req.ip` with `trust proxy = loopback`
 *   (the app sits behind local nginx). nginx appends the real client to
 *   X-Forwarded-For, so Express reads the rightmost hop — spoof-resistant for
 *   our single-proxy topology.
 * - Disabled in `NODE_ENV=test` so unit tests are never throttled.
 *
 * USAGE:
 *   router.post('/login', loginLimiter, authController.login);
 */
import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  hits: number[]; // timestamps (ms) of requests inside the window
}

export interface RateLimiterOptions {
  /** Human-readable name, included in log lines. */
  name: string;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum requests per window per key. */
  max: number;
}

const GLOBAL_BUCKETS = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 60_000;

// Periodically drop stale buckets so memory cannot grow unbounded.
// `unref()` keeps this timer from holding the process open on shutdown.
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - 10 * CLEANUP_INTERVAL_MS;
  for (const [key, bucket] of GLOBAL_BUCKETS) {
    const lastTs = bucket.hits[bucket.hits.length - 1];
    if (bucket.hits.length === 0 || (lastTs !== undefined && lastTs < cutoff)) {
      GLOBAL_BUCKETS.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

/**
 * Client identity for throttling. Uses Express's `req.ip` (accurate behind
 * the trusted loopback proxy) with a socket fallback.
 */
function clientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Sliding-window limiter middleware factory.
 * Responds 429 + Retry-After when the window is exhausted.
 */
export function createRateLimiter(opts: RateLimiterOptions) {
  const { name, windowMs, max } = opts;

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    // Never throttle automated tests.
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const key = `${name}:${clientKey(req)}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    let bucket = GLOBAL_BUCKETS.get(key);
    if (!bucket) {
      bucket = { hits: [] };
      GLOBAL_BUCKETS.set(key, bucket);
    }

    // Slide the window: drop everything older than the cutoff.
    while (bucket.hits.length > 0 && (bucket.hits[0] ?? Infinity) <= cutoff) {
      bucket.hits.shift();
    }

    if (bucket.hits.length >= max) {
      const oldest = bucket.hits[0] ?? now;
      const retryAfterMs = oldest + windowMs - now;
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      // Generic on purpose: no hints about which accounts exist or why.
      res.status(429).json({ message: 'Too many attempts. Please try again shortly.' });
      return;
    }

    bucket.hits.push(now);
    next();
  };
}

/** Exposed for tests: clear all buckets between cases. */
export function resetRateLimiter(): void {
  GLOBAL_BUCKETS.clear();
}
