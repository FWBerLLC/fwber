/**
 * SSRF hardening tests (v2.3.40).
 *
 * Focus: the bypasses fixed in v2.3.40 —
 *  - IPv4-mapped IPv6 literals (`::ffff:127.0.0.1`) slipping past the
 *    private-range check via the `ipv4Mapped` range name
 *  - fail-open when DNS resolves to nothing
 *  - metadata/CGNAT/tunnel ranges
 */
import { jest } from '@jest/globals';

// --- DNS mock so resolution paths are deterministic ---
// NOTE: the module wraps these with util.promisify, so the mocks MUST be
// callback-style (cb(err, addrs)) — promise-returning mocks would hang.
const mockResolve4 = jest.fn();
const mockResolve6 = jest.fn();

const v4 = (addrs: string[]) => mockResolve4.mockImplementation(
  (_host: unknown, cb: unknown) => (cb as (e: unknown, a?: unknown) => void)(null, addrs)
);
const v6 = (addrs: string[]) => mockResolve6.mockImplementation(
  (_host: unknown, cb: unknown) => (cb as (e: unknown, a?: unknown) => void)(null, addrs)
);
const v4Err = () => mockResolve4.mockImplementation(
  (_host: unknown, cb: unknown) => (cb as (e: unknown) => void)(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }))
);
const v6Err = () => mockResolve6.mockImplementation(
  (_host: unknown, cb: unknown) => (cb as (e: unknown) => void)(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }))
);

jest.unstable_mockModule('dns', () => {
  const lookup = jest.fn();
  return {
    default: { resolve4: mockResolve4, resolve6: mockResolve6, lookup },
    resolve4: mockResolve4,
    resolve6: mockResolve6,
    lookup,
  };
});

const { validateFederationUrl, isPrivateIp } = await import('../src/lib/ssrf.js');
const ipaddr = (await import('ipaddr.js')).default;

describe('isPrivateIp', () => {
  const isPrivate = (s: string) => isPrivateIp(ipaddr.parse(s));

  it('blocks classic private and loopback IPv4', () => {
    expect(isPrivate('127.0.0.1')).toBe(true);
    expect(isPrivate('10.0.0.5')).toBe(true);
    expect(isPrivate('192.168.1.1')).toBe(true);
    expect(isPrivate('172.16.0.1')).toBe(true);
    expect(isPrivate('169.254.169.254')).toBe(true); // cloud metadata
  });

  it('blocks CGNAT, multicast and broadcast', () => {
    expect(isPrivate('100.64.0.1')).toBe(true); // carrier-grade NAT
    expect(isPrivate('224.0.0.1')).toBe(true);  // multicast
    expect(isPrivate('255.255.255.255')).toBe(true); // broadcast
  });

  it('allows ordinary public IPv4', () => {
    expect(isPrivate('8.8.8.8')).toBe(false);
    expect(isPrivate('1.1.1.1')).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 smuggling of private addresses (fixed bypass)', () => {
    // BEFORE v2.3.40 these classified as range "ipv4Mapped" and were allowed.
    expect(isPrivate('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivate('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivate('::ffff:169.254.169.254')).toBe(true);
  });

  it('allows IPv4-mapped IPv6 of public addresses', () => {
    expect(isPrivate('::ffff:8.8.8.8')).toBe(false);
  });

  it('blocks IPv6 loopback, link-local, unique-local and transition tunnels', () => {
    expect(isPrivate('::1')).toBe(true);
    expect(isPrivate('fe80::1')).toBe(true);
    expect(isPrivate('fc00::1')).toBe(true);
    expect(isPrivate('2002:7f00:0001::')).toBe(true); // 6to4 wrapping 127.0.0.1
    expect(isPrivate('64:ff9b::7f00:1')).toBe(true);  // NAT64 wrapping 127.0.0.1
  });
});

describe('validateFederationUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // DNS errors by default (no resolution) unless a test overrides.
    v4Err();
    v6Err();
  });

  it('rejects malformed URLs', async () => {
    expect(await validateFederationUrl('not a url')).toBe(false);
    expect(await validateFederationUrl('')).toBe(false);
  });

  it('rejects literal private IPs including mapped IPv6', async () => {
    expect(await validateFederationUrl('http://127.0.0.1/')).toBe(false);
    expect(await validateFederationUrl('http://[::ffff:127.0.0.1]/')).toBe(false);
    expect(await validateFederationUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(await validateFederationUrl('http://[::1]/')).toBe(false);
  });

  it('accepts literal public IPs', async () => {
    expect(await validateFederationUrl('https://8.8.8.8/')).toBe(true);
    expect(await validateFederationUrl('https://[::ffff:8.8.8.8]/')).toBe(true);
  });

  it('rejects hostnames resolving to private addresses', async () => {
    v4(['10.0.0.9']);
    v6Err();
    expect(await validateFederationUrl('https://evil.example/')).toBe(false);
  });

  it('FAILS CLOSED when nothing resolves (was fail-open before v2.3.40)', async () => {
    // Both families error → zero addresses → must NOT return true.
    expect(await validateFederationUrl('https://unresolvable.example/')).toBe(false);
  });

  it('accepts hostnames resolving only to public addresses', async () => {
    v4(['93.184.216.34']);
    v6Err();
    expect(await validateFederationUrl('https://example.com/')).toBe(true);
  });

  it('rejects a hostname whose mixed records include a private address', async () => {
    v4(['93.184.216.34', '192.168.0.10']);
    v6Err();
    expect(await validateFederationUrl('https://rebind.example/')).toBe(false);
  });
});
