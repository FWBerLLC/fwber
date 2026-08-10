import ipaddr from 'ipaddr.js';
import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';
import http from 'http';
import https from 'https';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

/**
 * Validates a URL to prevent SSRF by checking if its hostname resolves to a private IP.
 * This function also provides a custom agent to mitigate DNS Rebinding by pinning the validated IP.
 */
export async function validateFederationUrl(urlStr: string): Promise<boolean> {
    try {
        const url = new URL(urlStr);
        const hostname = url.hostname;

        // Block literal IPs that are private/loopback
        if (ipaddr.isValid(hostname)) {
            const addr = ipaddr.parse(hostname);
            if (isPrivateIp(addr)) {
                return false;
            }
        }

        // Resolve hostname to IPs and check them
        const ips: string[] = [];
        try {
            const v4 = await resolve4(hostname);
            ips.push(...v4);
        } catch {}
        try {
            const v6 = await resolve6(hostname);
            ips.push(...v6);
        } catch {}

        for (const ip of ips) {
            if (ipaddr.isValid(ip)) {
                if (isPrivateIp(ipaddr.parse(ip))) {
                    return false;
                }
            }
        }

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Hardened SSRF check: Resolves and validates the hostname's IP, then returns a pinned IP
 * to prevent DNS Rebinding (TOCTOU).
 */
export async function getHardenedFederationAgent(urlStr: string) {
    const url = new URL(urlStr);
    const hostname = url.hostname;

    let targetIp: string | null = null;

    if (ipaddr.isValid(hostname)) {
        const addr = ipaddr.parse(hostname);
        if (isPrivateIp(addr)) throw new Error('Blocked private IP');
        targetIp = hostname;
    } else {
        const ips: string[] = [];
        try { const v4 = await resolve4(hostname); ips.push(...v4); } catch {}
        try { const v6 = await resolve6(hostname); ips.push(...v6); } catch {}

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

    // Use a custom agent that overrides lookup to return the pinned IP
    return new Agent({
        lookup: (host, opts, cb) => {
            if (host === hostname && targetIp) {
                // Pin the resolved IP
                (cb as any)(null, targetIp, targetIp.includes(':') ? 6 : 4);
            } else {
                dns.lookup(host, opts, cb);
            }
        }
    });
}

function isPrivateIp(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
    const range = addr.range();
    const privateRanges = [
        'loopback',
        'linkLocal',
        'private',
        'uniqueLocal',
        'reserved',
        'unspecified'
    ];

    // Explicitly block 172.16.0.0/12 which some libraries might categorize differently
    if (addr.kind() === 'ipv4') {
        const octets = (addr as any).toByteArray();
        if (octets && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
            return true;
        }
    }

    return privateRanges.includes(range);
}


