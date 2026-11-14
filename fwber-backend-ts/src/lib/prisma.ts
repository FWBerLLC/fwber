import { PrismaClient } from '@prisma/client';

/**
 * Guarantee an explicit connection-pool size on the datasource URL.
 *
 * Why: prod registration intermittently died with P2024 pool timeouts
 * ("connection limit: 3", 2026-11-14) whenever the shared box got busy —
 * the effective limit of 3 serializes even light auth traffic behind
 * long queries. 20 connections is still trivial against MySQL's default
 * 151 max_connections shared with co-tenants, and pool_timeout matches
 * so waiters fail in 20s instead of hanging a request for 50s.
 * Operator-provided params in DATABASE_URL always win.
 */
export function withConnectionPool(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const params: string[] = [];
  if (!/[?&]connection_limit=/.test(url)) params.push('connection_limit=20');
  if (!/[?&]pool_timeout=/.test(url)) params.push('pool_timeout=20');
  if (params.length === 0) return url;
  return url + (url.includes('?') ? '&' : '?') + params.join('&');
}

const datasourceUrl = withConnectionPool(process.env.DATABASE_URL);
const prisma = datasourceUrl
  ? new PrismaClient({ datasources: { db: { url: datasourceUrl } } })
  : new PrismaClient();

/**
 * Recursively convert BigInt values to String for JSON serialization to prevent precision loss.
 * Although IDs currently fit in Number (up to 2^53-1), using Strings ensures long-term safety.
 */
export const serialize = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj && typeof obj === 'object' && typeof obj.toFixed === 'function' && 'd' in obj && 'e' in obj) return Number(obj.toString());
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const key of Object.keys(obj)) {
      out[key] = serialize(obj[key]);
    }
    return out;
  }
  return obj;
};

const SENSITIVE_FIELDS = [
  'password', 'decoy_password', 'two_factor_secret',
  'two_factor_recovery_codes', 'remember_token', 'merchant_secret',
  'stripe_customer_id', 'provider_id', 'provider_token',
  'id_verification_data', 'last_login_ip'
];

/**
 * Remove sensitive fields from a user object before sending it to the client.
 */
export const sanitizeUser = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeUser);

  const out: any = {};
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_FIELDS.includes(key)) continue;
    out[key] = sanitizeUser(obj[key]);
  }
  return out;
};

export default prisma;
