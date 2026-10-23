/**
 * Rate limiter tests (v2.3.40).
 *
 * The middleware is disabled when NODE_ENV=test (so other suites are never
 * throttled), so these tests flip NODE_ENV explicitly.
 */
import { jest } from '@jest/globals';

const { createRateLimiter, resetRateLimiter } = await import('../src/lib/rateLimit.js');

type Req = { ip?: string; socket?: { remoteAddress?: string } };
type Res = {
  statusCode?: number;
  headers: Record<string, string>;
  body?: unknown;
  setHeader(k: string, v: string): void;
  status(code: number): Res;
  json(payload: unknown): void;
};

function makeRes(): Res {
  const res: Res = {
    headers: {},
    setHeader(k: string, v: string) { res.headers[k] = v; },
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { res.body = payload; },
  };
  return res;
}

function makeReq(ip: string): Req {
  return { ip, socket: { remoteAddress: ip } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createRateLimiter', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    resetRateLimiter();
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('passes requests under the limit and counts per key', () => {
    const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 3 });
    const next = jest.fn();

    for (let i = 0; i < 3; i++) {
      const res = makeRes();
      limiter(makeReq('1.2.3.4'), res, next as unknown as () => void);
    }

    expect(next).toHaveBeenCalledTimes(3);
  });

  it('returns 429 with Retry-After once the limit is exceeded', () => {
    const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 2 });
    const next = jest.fn();

    limiter(makeReq('1.2.3.4'), makeRes(), next as unknown as () => void);
    limiter(makeReq('1.2.3.4'), makeRes(), next as unknown as () => void);

    const res = makeRes();
    limiter(makeReq('1.2.3.4'), res, next as unknown as () => void);

    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeDefined();
    expect(res.body).toHaveProperty('message');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('keeps buckets separate per client', () => {
    const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 1 });
    const next = jest.fn();

    limiter(makeReq('1.2.3.4'), makeRes(), next as unknown as () => void);
    limiter(makeReq('5.6.7.8'), makeRes(), next as unknown as () => void);

    expect(next).toHaveBeenCalledTimes(2);

    const res = makeRes();
    limiter(makeReq('1.2.3.4'), res, next as unknown as () => void);
    expect(res.statusCode).toBe(429);
  });

  it('slides the window: capacity frees after windowMs', async () => {
    const limiter = createRateLimiter({ name: 'test', windowMs: 50, max: 1 });
    const next = jest.fn();

    limiter(makeReq('9.9.9.9'), makeRes(), next as unknown as () => void);
    const blocked = makeRes();
    limiter(makeReq('9.9.9.9'), blocked, next as unknown as () => void);
    expect(blocked.statusCode).toBe(429);

    await sleep(70);

    const res = makeRes();
    limiter(makeReq('9.9.9.9'), res, next as unknown as () => void);
    expect(res.statusCode).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('is disabled under NODE_ENV=test so other suites are not throttled', () => {
    process.env.NODE_ENV = 'test';
    const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 1 });
    const next = jest.fn();

    for (let i = 0; i < 5; i++) {
      limiter(makeReq('4.4.4.4'), makeRes(), next as unknown as () => void);
    }
    expect(next).toHaveBeenCalledTimes(5);
  });
});
