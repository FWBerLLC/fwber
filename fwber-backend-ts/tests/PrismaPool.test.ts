import { describe, it, expect } from '@jest/globals';
import { withConnectionPool } from '../src/lib/prisma.js';

// Prod incident 2026-11-14: registration intermittently failed with
// P2024 "Timed out fetching a new connection from the connection pool
// (connection limit: 3)" under shared-box load — a 50s register that
// surfaced as 500 "Registration is temporarily unavailable". The pool
// helper guarantees an explicit, sane pool size on the datasource URL
// without overriding operator-provided settings.

describe('withConnectionPool', () => {
  it('adds pool params to a bare MySQL URL', () => {
    const url = withConnectionPool('mysql://u:p@127.0.0.1:3306/fwber');
    expect(url).toContain('connection_limit=20');
    expect(url).toContain('pool_timeout=20');
    expect(url?.startsWith('mysql://u:p@127.0.0.1:3306/fwber?')).toBe(true);
  });

  it('appends with & when the URL already has query params', () => {
    const url = withConnectionPool('mysql://u:p@h/db?sslaccept=strict');
    expect(url).toContain('sslaccept=strict');
    expect(url).toContain('&connection_limit=20');
  });

  it('never overrides operator-provided pool settings', () => {
    const url = withConnectionPool('mysql://u:p@h/db?connection_limit=5&pool_timeout=7');
    expect(url).toContain('connection_limit=5');
    expect(url).toContain('pool_timeout=7');
    expect(url).not.toContain('connection_limit=20');
  });

  it('passes through missing/empty URLs so Prisma can fall back to env', () => {
    expect(withConnectionPool(undefined)).toBeUndefined();
    expect(withConnectionPool('')).toBeUndefined();
  });
});
