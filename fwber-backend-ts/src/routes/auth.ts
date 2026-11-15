import { Router } from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../services/AuthService.js';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import { validateFederationUrl, getHardenedFederationAgent } from '../lib/ssrf.js';

const router = Router();
const authController = new AuthController();
const authService = new AuthService();

// Brute-force / enumeration throttling (v2.3.40). Windows are per-client-IP.
// These are deliberately generous enough for shared NATs (many users behind
// one office/CGNAT IP) while stopping credential stuffing and reset-spam.
const registerLimiter = createRateLimiter({ name: 'auth-register', windowMs: 60_000, max: 5 });
const loginLimiter = createRateLimiter({ name: 'auth-login', windowMs: 60_000, max: 10 });
const forgotLimiter = createRateLimiter({ name: 'auth-forgot', windowMs: 60_000, max: 5 });
const resetLimiter = createRateLimiter({ name: 'auth-reset', windowMs: 60_000, max: 10 });
const referralLimiter = createRateLimiter({ name: 'auth-referral', windowMs: 60_000, max: 30 });
const federatedLimiter = createRateLimiter({ name: 'auth-federated', windowMs: 60_000, max: 10 });

/**
 * In-memory 15-minute TTL map of issued ActivityPub profile bio challenges,
 * keyed by canonical `actor_uri` (`FederatedAuthModal.tsx`).
 */
interface FederatedChallengeEntry {
  challenge: string;
  handle: string;
  expiresAt: number;
}
export const federatedChallenges = new Map<string, FederatedChallengeEntry>();

/**
 * Perform an outbound JSON GET pinned to `getHardenedFederationAgent(urlStr)` so
 * DNS rebinding and private/RFC1918/loopback/metadata IPs are rejected on the wire.
 * Exported on a replaceable helper object for clean deterministic unit testing.
 */
export const federatedHttp = {
  async getJson(urlStr: string, acceptHeader: string): Promise<any> {
    const safe = await validateFederationUrl(urlStr);
    if (!safe) {
      throw new Error('Blocked unsafe or unresolvable federation URL');
    }
    const agent = await getHardenedFederationAgent(urlStr);
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.request(
        parsed,
        {
          method: 'GET',
          agent,
          headers: {
            Accept: acceptHeader,
            'User-Agent': 'fwber-federation/2.3 (+https://fwber.online)',
          },
          timeout: 8000,
        },
        (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            return reject(new Error(`Remote server returned HTTP ${res.statusCode || 0}`));
          }
          const chunks: Buffer[] = [];
          let total = 0;
          res.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > 512 * 1024) {
              req.destroy(new Error('Remote ActivityPub payload exceeded 512KB limit'));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
              reject(new Error('Invalid JSON from remote federation endpoint'));
            }
          });
        }
      );
      req.on('timeout', () => req.destroy(new Error('Federation request timed out')));
      req.on('error', reject);
      req.end();
    });
  },
};

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/wallet-nonce', loginLimiter, authController.walletNonce);
router.post('/login-wallet', loginLimiter, authController.loginWallet);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', forgotLimiter, authController.forgotPassword);
router.post('/reset-password', resetLimiter, authController.resetPassword);

router.get('/referral/:code', referralLimiter, async (req: Request<{ code: string }>, res: Response) => {
  try {
    const { code } = req.params;
    const user = await prisma.users.findFirst({
      where: { referral_code: code },
      include: { user_profiles: true }
    });
    if (!user) {
      return res.status(404).json({ valid: false, message: 'Invalid referral code' });
    }
    const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
    res.json({
      valid: true,
      referrer_name: profile?.display_name || user.name || 'A user',
      referrer_avatar: profile?.avatar_url || null,
      referrer_id: Number(user.id)
    });
  } catch (error: any) {
    console.error('[Auth] Referral lookup error:', error.message);
    res.status(500).json({ valid: false });
  }
});

/**
 * POST /api/auth/federated/challenge
 * Resolve `@user@domain` via RFC 7033 WebFinger over SSRF-hardened HTTPS and issue
 * a 15-minute single-use `fwber-verify-<hex>` bio challenge (`FederatedAuthModal.tsx`).
 */
router.post('/federated/challenge', federatedLimiter, async (req: Request, res: Response) => {
  try {
    const rawHandle = String(req.body?.handle || '').trim().replace(/^@/, '');
    const parts = rawHandle.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1] || !/^[a-zA-Z0-9._-]+$/.test(parts[0]) || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(parts[1])) {
      return res.status(400).json({ message: 'Provide a valid ActivityPub handle such as @user@mastodon.social' });
    }

    const [username, domain] = parts;
    const webfingerUrl = `https://${domain.toLowerCase()}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${username}@${domain.toLowerCase()}`)}`;

    const jrd = await federatedHttp.getJson(webfingerUrl, 'application/jrd+json, application/json');
    const links: any[] = Array.isArray(jrd?.links) ? jrd.links : [];
    const selfLink = links.find(
      (l) =>
        l?.rel === 'self' &&
        typeof l?.href === 'string' &&
        (String(l.type || '').includes('activity+json') || String(l.type || '').includes('ld+json'))
    );

    if (!selfLink?.href || !String(selfLink.href).startsWith('https://')) {
      return res.status(400).json({ message: 'No HTTPS ActivityPub actor found for handle' });
    }

    const actorUri = String(selfLink.href).trim();
    const challenge = `fwber-verify-${crypto.randomBytes(12).toString('hex')}`;
    const now = Date.now();
    for (const [k, v] of federatedChallenges) {
      if (v.expiresAt <= now) federatedChallenges.delete(k);
    }
    federatedChallenges.set(actorUri, {
      challenge,
      handle: `${username}@${domain.toLowerCase()}`,
      expiresAt: now + 15 * 60 * 1000,
    });

    return res.json({
      actor_uri: actorUri,
      challenge,
      expires_in: 900,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || 'Failed to resolve ActivityPub handle' });
  }
});

/**
 * POST /api/auth/federated/verify
 * Fetch `actor_uri` via SSRF-hardened ActivityPub GET, confirm the issued challenge token
 * appears in the remote actor's bio/summary or profile fields, provision/locate the local
 * federated account, and mint a session JWT (`{ token, access_token, user }`).
 */
router.post('/federated/verify', federatedLimiter, async (req: Request, res: Response) => {
  try {
    const actorUri = String(req.body?.actor_uri || '').trim();
    if (!actorUri.startsWith('https://')) {
      return res.status(400).json({ message: 'Valid HTTPS actor_uri is required' });
    }

    const pending = federatedChallenges.get(actorUri);
    if (!pending || pending.expiresAt <= Date.now()) {
      federatedChallenges.delete(actorUri);
      return res.status(400).json({ message: 'Challenge expired or not found. Please start verification again.' });
    }

    const actor = await federatedHttp.getJson(
      actorUri,
      'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/json'
    );

    const attachmentValues = Array.isArray(actor?.attachment)
      ? actor.attachment.map((a: any) => `${a?.name || ''} ${a?.value || ''}`).join(' ')
      : '';
    const searchableBio = `${actor?.summary || ''} ${actor?.note || ''} ${attachmentValues}`;

    if (!searchableBio.includes(pending.challenge)) {
      return res.status(400).json({ message: 'Challenge token not detected in remote profile summary.' });
    }

    // Consume single-use challenge
    federatedChallenges.delete(actorUri);

    const actorHost = new URL(actorUri).hostname.toLowerCase();
    const preferredUsername = String(actor?.preferredUsername || pending.handle.split('@')[0] || 'fediverse')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 40) || 'fediverse';
    const syntheticEmail = `${preferredUsername}@${actorHost}.fediverse.fwber.local`.toLowerCase();
    const displayName = String(actor?.name || preferredUsername).slice(0, 80);

    let user = await prisma.users.findUnique({
      where: { email: syntheticEmail },
      include: { user_profiles: true },
    });

    if (!user) {
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const now = new Date();
      user = await prisma.users.create({
        data: {
          name: displayName,
          email: syntheticEmail,
          email_verified_at: now,
          password: randomPasswordHash,
          role: 'user',
          tier: 'free',
          referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          created_at: now,
          updated_at: now,
          user_profiles: {
            create: {
              display_name: displayName,
              bio: `Federated identity: @${pending.handle}`,
              is_federated: true,
              social_media: { fediverse: `@${pending.handle}`, actor_uri: actorUri },
              avatar_url: typeof actor?.icon?.url === 'string' ? actor.icon.url : null,
              created_at: now,
              updated_at: now,
            },
          },
        },
        include: { user_profiles: true },
      });
    }

    const token = authService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const hydrated = await authService.hydrateUser(user);

    return res.json({
      token,
      access_token: token,
      token_type: 'Bearer',
      user: hydrated,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || 'Federated identity verification failed' });
  }
});

export default router;
