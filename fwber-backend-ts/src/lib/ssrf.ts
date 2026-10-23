/**
 * SSRF protection for federation (ActivityPub/WebFinger) outbound requests.
 *
 * WHAT THIS DEFENDS AGAINST
 * - Server-Side Request Forgery: a malicious (or compromised) federated peer
 *   handing us URLs that point at internal infrastructure — cloud metadata
 *   (169.254.169.254), loopback services (Redis/MySQL/admin panels), RFC1918
 *   hosts, link-local, etc.
 * - DNS rebinding (TOCTOU): hostname resolves to a public IP during the check
 *   but a private IP at connect time. Mitigated by PINNING the validated IP in
 *   a custom agent whose `lookup` always returns the vetted address.
 * - Redirect pivots: the server follows an HTTP redirect to
 *   `http://127.0.0.1/...`. The custom agent's fallback lookup (used for any
 *   host other than the pinned one — e.g. a redirect target) ALSO refuses
 *   private addresses, so every connection this agent makes is public-only.
 *
 * KNOWN LIMITATIONS (documented, not silently ignored)
 * - Literal-IP redirects to *public* addresses are still followed (that is
 *   legitimate behavior; the point is that private targets are refused).
 * - Ports are not restricted: public-IP services on unusual ports are allowed.
 *   Federation requires arbitrary peer ports, so this is by design.
 *
 * HISTORY (v2.3.40 hardening)
 * - IPv4-mapped IPv6 literals (`::ffff:127.0.0.1`) previously classified as
 *   range `ipv4Mapped`, which was NOT in the private blocklist — a bypass via
 *   `http://[::ffff:127.0.0.1]/`. Now converted to IPv4 and re-checked.
 * - `validateFederationUrl` previously returned TRUE when DNS resolution
 *   produced no addresses (fail-open). Now fails closed: unverifiable = blocked.
 * - The agent's fallback `dns.lookup` previously connected to whatever it
 *   resolved (redirect pivot). Now validates every address it returns.
 * - Carrier-grade NAT, multicast, broadcast and benchmarking ranges added to
 *   the blocklist.
 */
import ipaddr from 'ipaddr.js';
import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';
import http from 'http';
import https from 'https';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

/** Address ranges that must never be contacted on behalf of a remote peer. */
const BLOCKED_RANGES = [
    'loopback',
    'linkLocal',
    'private',
    'uniqueLocal',
    'reserved',
    'unspecified',
    'carrierGradeNat', // 100.64.0.0/10 — ISP-grade NAT, internal-ish
    'multicast',
    'broadcast',
    'benchmarking'
];

/**
 * Returns true when the address is unsafe to contact (private/internal).
 *
 * Handles the sneaky encodings:
 * - IPv4-mapped IPv6 (`::ffff:10.0.0.1`): converted to the embedded IPv4 and
 *   re-checked, so `isPrivateIp` sees the REAL scope.
 * - IPv6 transition prefixes that embed an IPv4 (6to4 `2002::/16`, Teredo,
 *   NAT64 `64:ff9b::/96` / `rfc6052`): the embedded IPv4 may be private, so
 *   these are treated as unsafe outright (no legitimate federation peer needs
 *   them).
 */
export function isPrivateIp(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
    const range = addr.range();

    // IPv4-mapped IPv6: judge the embedded IPv4 address, not the wrapper.
    if (range === 'ipv4Mapped') {
        return isPrivateIp((addr as ipaddr.IPv6).toIPv4Address());
    }

    // Transition tunnels that smuggle an IPv4 inside an IPv6 literal.
    // (ipaddr.js names the NAT64 range "rfc6052".)
    if (range === '6to4' || range === 'teredo' || range === 'rfc6052') {
        return true;
    }

    // Explicitly block 172.16.0.0/12 which some libraries might categorize differently
    if (addr.kind() === 'ipv4') {
        const octets = (addr as unknown as { toByteArray(): number[] }).toByteArray();
        const first = octets?.[0];
        const second = octets?.[1];
        if (first === 172 && second !== undefined && second >= 16 && second <= 31) {
            return true;
        }
    }

    return BLOCKED_RANGES.includes(range);
}

/**
 * Collect every A/AAAA address for a hostname.
 * Individual family failures are tolerated (an A-only or AAAA-only host is
 * normal) but total failure is distinguished from "resolved to nothing" so
 * callers can FAIL CLOSED instead of guessing.
 */
async function resolveAll(hostname: string): Promise<{ ips: string[]; errors: string[] }> {
    const ips: string[] = [];
    const errors: string[] = [];
    try {
        const v4 = await resolve4(hostname);
        ips.push(...v4);
    } catch (err: any) {
        errors.push(`A: ${err?.code || err?.message}`);
    }
    try {
        const v6 = await resolve6(hostname);
        ips.push(...v6);
    } catch (err: any) {
        errors.push(`AAAA: ${err?.code || err?.message}`);
    }
    return { ips, errors };
}

/**
 * Validates a URL to prevent SSRF by checking if its hostname resolves to a private IP.
 * This function also provides a custom agent to mitigate DNS Rebinding by pinning the validated IP.
 *
 * FAIL-CLOSED: returns false for malformed URLs, private literal IPs, hosts
 * that resolve to any private address, and hosts that resolve to NOTHING
 * (previously this last case returned true — a fail-open hole).
 */
export async function validateFederationUrl(urlStr: string): Promise<boolean> {
    try {
        const url = new URL(urlStr);
        // WHATWG URL keeps brackets around IPv6 literals ("[::1]") — strip them
        // so ipaddr.js can parse the literal instead of treating it as a host.
        const hostname = url.hostname.replace(/^\[|\]$/g, '');

        // Block literal IPs that are private/loopback (incl. bracketed IPv6).
        if (ipaddr.isValid(hostname)) {
            const addr = ipaddr.parse(hostname);
            return !isPrivateIp(addr);
        }

        // Resolve hostname to IPs and check them all.
        const { ips } = await resolveAll(hostname);
        if (ips.length === 0) {
            // Could not verify — refuse rather than assume safe.
            return false;
        }

        for (const ip of ips) {
            if (ipaddr.isValid(ip)) {
                if (isPrivateIp(ipaddr.parse(ip))) {
                    return false;
                }
            } else {
                // Resolver returned something unparsable — unverifiable.
                return false;
            }
        }

        return true;
    } catch {
        // Malformed URL or unexpected parse error — refuse.
        return false;
    }
}

/**
 * Hardened SSRF check: Resolves and validates the hostname's IP, then returns a pinned IP
 * to prevent DNS Rebinding (TOCTOU).
 *
 * The returned agent additionally guards EVERY connection it makes (including
 * HTTP redirect targets) against private addresses — see module docs.
 *
 * THROWS on: malformed URL, private literal IP, no safe public resolution.
 * Callers must handle the rejection (all federation call sites do).
 */
export async function getHardenedFederationAgent(urlStr: string): Promise<http.Agent | https.Agent> {
    const url = new URL(urlStr);
    // Strip IPv6 brackets (see validateFederationUrl) so literal checks work.
    const hostname = url.hostname.replace(/^\[|\]$/g, '');

    let targetIp: string | null = null;

    if (ipaddr.isValid(hostname)) {
        const addr = ipaddr.parse(hostname);
        if (isPrivateIp(addr)) throw new Error('Blocked private IP');
        targetIp = hostname;
    } else {
        const { ips } = await resolveAll(hostname);
        for (const ip of ips) {
            if (ipaddr.isValid(ip) && !isPrivateIp(ipaddr.parse(ip))) {
                targetIp = ip;
                break;
            }
        }
    }

    if (!targetIp) throw new Error('Could not resolve to a safe public IP');

    const isHttps = url.protocol === 'https:';
    const Agent = isHttps ? https.Agent : http.Agent;

    // Use a custom agent that overrides lookup to return the pinned IP.
    // The FALLBACK branch (any other host — e.g. a redirect target) validates
    // the resolved address too, closing the redirect-pivot SSRF vector.
    return new Agent({
        lookup: ((host: string, opts: unknown, cb: (...args: unknown[]) => void) => {
            if (host === hostname && targetIp) {
                // Pin the validated IP (family 6 for IPv6 literals, else 4).
                (cb as (a: null, b: string, c: number) => void)(null, targetIp, targetIp.includes(':') ? 6 : 4);
            } else {
                dns.lookup(host, opts as dns.LookupOptions, (err, address, family) => {
                    if (err) return (cb as (e: unknown) => void)(err);
                    // `dns.lookup` can return an array when `all: true`.
                    const resolved = typeof address === 'string' ? address : address?.[0]?.address;
                    if (!resolved) return (cb as (e: unknown) => void)(new Error('Unparsable DNS result'));
                    // Redirect/secondary hop: same safety bar as the original.
                    if (!ipaddr.isValid(resolved) || isPrivateIp(ipaddr.parse(resolved))) {
                        return (cb as (e: unknown) => void)(new Error('Blocked private IP on secondary connection (possible redirect pivot)'));
                    }
                    (cb as (...a: unknown[]) => void)(null, resolved, family);
                });
            }
        }) as unknown as typeof dns.lookup
    });
}
