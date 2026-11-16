import { jest } from '@jest/globals';
import { captureException, initSentry, parseSentryDsn } from '../src/lib/sentry.js';

// Backend Sentry reporter: zero-dep envelope client. The DSN sat in the
// server env with no SDK consuming it; these tests pin DSN parsing, the
// armed/no-op contract, and the envelope shape sent to ingest.

const DSN = 'https://abc123publickey@o123.ingest.us.sentry.io/456789';

describe('parseSentryDsn', () => {
  it('parses a standard DSN into an envelope URL', () => {
    const p = parseSentryDsn(DSN);
    expect(p).not.toBeNull();
    expect(p!.publicKey).toBe('abc123publickey');
    expect(p!.projectId).toBe('456789');
    expect(p!.envelopeUrl).toBe('https://o123.ingest.us.sentry.io/api/456789/envelope/');
  });

  it('returns null for missing or malformed DSNs', () => {
    expect(parseSentryDsn(undefined)).toBeNull();
    expect(parseSentryDsn('')).toBeNull();
    expect(parseSentryDsn('not-a-url')).toBeNull();
    expect(parseSentryDsn('https://o123.ingest.us.sentry.io/')).toBeNull();
  });
});

describe('initSentry', () => {
  it('arms only with a valid SENTRY_DSN', () => {
    expect(initSentry({} as NodeJS.ProcessEnv)).toBe(false);
    expect(initSentry({ SENTRY_DSN: DSN } as NodeJS.ProcessEnv)).toBe(true);
    expect(initSentry({ SENTRY_DSN: 'garbage' } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('captureException', () => {
  it('posts a well-formed exception envelope and never throws', async () => {
    const calls: any[] = [];
    const fetchFn = (async (url: any, init: any) => { calls.push({ url, init }); return { ok: true }; }) as any;
    const dsn = parseSentryDsn(DSN)!;

    expect(() => captureException(new TypeError('boom'), fetchFn, dsn)).not.toThrow();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(dsn.envelopeUrl);
    expect(calls[0].init.headers['X-Sentry-Auth']).toContain('sentry_key=abc123publickey');

    const lines = String(calls[0].init.body).split('\n').map((l) => JSON.parse(l));
    expect(lines[1]).toEqual({ type: 'event' });
    expect(lines[2].exception.values[0]).toEqual({ type: 'TypeError', value: 'boom' });
  });

  it('is a no-op without a DSN', () => {
    const fetchFn = jest.fn(async () => ({ ok: true })) as any;
    captureException(new Error('x'), fetchFn, null);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('swallows transport failures', async () => {
    const fetchFn = (async () => { throw new Error('network down'); }) as any;
    const dsn = parseSentryDsn(DSN)!;
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => captureException(new Error('x'), fetchFn, dsn)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
