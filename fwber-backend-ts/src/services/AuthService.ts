import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma, { serialize, sanitizeUser } from '../lib/prisma.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js';
import { createVerificationToken } from '../lib/verification-store.js';
import { AutonomousTaskExecutor } from './AutonomousTaskExecutor.js';
import { AuthError } from '../lib/AuthError.js';
import { base58Decode } from '../lib/base58.js';

// ---------------------------------------------------------------------------
// Wallet (ed25519) login constants.
// The Solana wallet flow (fwber-frontend app/login/page.tsx) signs exactly:
//   `Sign this message to login to fwber.\n\nWallet: <base58>\nTimestamp: <ms>`
// and POSTs { wallet_address, signature, message } to /api/auth/login-wallet.
// ---------------------------------------------------------------------------
const WALLET_LOGIN_PREFIX = 'Sign this message to login to fwber.';
const WALLET_LOGIN_MAX_AGE_MS = 5 * 60 * 1000; // signed timestamp freshness
const WALLET_LOGIN_MAX_FUTURE_SKEW_MS = 60 * 1000; // clock-skew tolerance
const WALLET_REPLAY_TTL_MS = WALLET_LOGIN_MAX_AGE_MS + 60 * 1000;

/** One-time-use cache for consumed signatures (replay protection). */
const walletLoginReplays = new Map<string, number>();

function pruneWalletReplays(now: number) {
  for (const [key, exp] of walletLoginReplays) {
    if (exp <= now) walletLoginReplays.delete(key);
  }
}

/** Strict parser for the signed login message. Null on any structural drift. */
export function parseWalletLoginMessage(message: string): { address: string; timestamp: number } | null {
  const lines = message.split('\n');
  // Exactly 4 lines (allow one trailing newline).
  if (lines.length !== 4 && !(lines.length === 5 && lines[4] === '')) return null;
  const [line0, line1, line2, line3] = lines;
  if (line0 !== WALLET_LOGIN_PREFIX) return null;
  if (line1 !== '') return null;
  if (!line2?.startsWith('Wallet: ')) return null;
  const address = line2.slice('Wallet: '.length);
  if (!address || address.length > 128) return null;
  if (!line3?.startsWith('Timestamp: ')) return null;
  const tsRaw = line3.slice('Timestamp: '.length);
  if (!/^\d{1,15}$/.test(tsRaw)) return null;
  return { address, timestamp: Number(tsRaw) };
}

/** Verify an ed25519 signature with Node's native crypto (no deps). */
export function verifyEd25519(publicKeyRaw: Buffer, message: Buffer, signatureRaw: Buffer): boolean {
  if (publicKeyRaw.length !== 32 || signatureRaw.length !== 64) return false;
  try {
    // Raw 32-byte ed25519 pubkey -> SPKI DER (12-byte prefix + key).
    const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), publicKeyRaw]);
    const key = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
    return crypto.verify(null, message, key, signatureRaw);
  } catch {
    return false;
  }
}

export class AuthService {
  generateToken(user: { id: bigint; email: string; role: string }) {
    return jwt.sign(
      { id: Number(user.id), email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );
  }

  async hydrateUser(user: any) {
    const referralsCount = await prisma.users.count({
      where: { referrer_id: user.id }
    });

    return sanitizeUser(serialize({
      ...user,
      referrals_count: referralsCount,
      vouches_count: 0,
    }));
  }

  async registerUser(validatedData: any) {
    return AutonomousTaskExecutor.execute(
      { type: 'User Registration', impact: 'low', module: 'Auth' },
      async () => {
        const existingUser = await prisma.users.findUnique({
          where: { email: validatedData.email }
        });

        if (existingUser) {
          throw new AuthError('User already exists', 400);
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        // Handle referral code
        let referrerId: bigint | null = null;
        if (validatedData.referral_code) {
          const referrer = await prisma.users.findFirst({
            where: { referral_code: validatedData.referral_code }
          });
          if (referrer) {
            referrerId = referrer.id;
          }
        }

        const user = await prisma.users.create({
          data: {
            name: validatedData.name,
            email: validatedData.email,
            password: hashedPassword,
            role: 'user',
            tier: 'free',
            referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referrer_id: referrerId,
          },
        });

        // Reward referrer with 50 tokens
        if (referrerId) {
          await prisma.users.update({
            where: { id: referrerId },
            data: {
              token_balance: { increment: 50 }
            }
          });
        }

        // Initialize profile with default preferences
        await prisma.user_profiles.create({
          data: {
            user_id: user.id,
            display_name: user.name,
            preferences: JSON.stringify({
              age_min: 21,
              age_max: 45,
              distance_max: 25,
              show_me: 'all',
              drinking: 'any',
              smoking: 'any',
              education: 'any',
            }),
            looking_for: JSON.stringify(['dating', 'friendship']),
            interests: JSON.stringify([]),
            languages: JSON.stringify(['English']),
          },
        });

        // Welcome bonus: 50 FWB tokens
        await prisma.users.update({ where: { id: user.id }, data: { token_balance: 50 } });
        try {
          await prisma.wallet_transactions.create({ data: { user_id: user.id, amount: 50, type: 'reward', description: 'Welcome bonus — 50 free tokens!', created_at: new Date() } });
        } catch (_) {}

        // Seed default notification preferences
        const notifTypes = ['new_match', 'new_message', 'friend_request', 'event_invitation', 'gift_received', 'profile_view', 'achievement_unlocked', 'daily_reminder', 'marketing', 'proximity_alert'];
        try {
          await prisma.notification_preferences.createMany({
            data: notifTypes.map(type => ({ user_id: user.id, type, mail: true, push: true, database: true }))
          });
        } catch (_) {}

        // Send verification email
        try {
          const verificationToken = await createVerificationToken(user.id, user.email);
          await sendVerificationEmail(user.email, verificationToken);
        } catch (err) {
          console.error('[Auth] Failed to send initial verification email:', err);
        }

        const token = this.generateToken(user as any);
        const freshUser = await prisma.users.findUnique({ where: { id: user.id } });
        const hydrated = await this.hydrateUser(freshUser || user);

        return { token, user: hydrated };
      },
      // failOpen: routine registration must never be blocked by the
      // autonomous governance layer (see AuthError/executor docs).
      { failOpen: true }
    );
  }

  async loginUser(validatedData: any) {
    return AutonomousTaskExecutor.execute(
      { type: 'User Login', impact: 'low', module: 'Auth' },
      async () => {
        const user = await prisma.users.findUnique({
          where: { email: validatedData.email },
          include: { user_profiles: true }
        });

        // Unknown account OR account without a local password (OAuth-only /
        // migrated rows): bcryptjs throws on a null hash, so guard explicitly
        // and answer with the same generic 401 (no account enumeration).
        if (!user || !user.password) {
          throw new AuthError('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

        // Decoy password logic
        const isDecoyAuth =
          !isPasswordValid &&
          user.decoy_password !== null &&
          await bcrypt.compare(validatedData.password, user.decoy_password!);

        if (!isPasswordValid && !isDecoyAuth) {
          throw new AuthError('Invalid credentials');
        }

        let finalUser = user;
        if (isDecoyAuth && user.decoy_user_id) {
          const decoyUser = await prisma.users.findUnique({
            where: { id: user.decoy_user_id },
            include: { user_profiles: true }
          });
          if (decoyUser) {
            finalUser = decoyUser;
          }
        }

        const token = this.generateToken(finalUser as any);
        const hydrated = await this.hydrateUser(finalUser);

        return { token, user: hydrated };
      },
      // failOpen: user login must never be gated by system-health state —
      // this was the transient-401 root cause (see CHANGELOG 2.3.39).
      { failOpen: true }
    );
  }

  /**
   * Wallet login: verify an ed25519 signature over the standard login message,
   * then find-or-create the account bound to that wallet address.
   *
   * Security model:
   *  - The signature proves control of the private key (the address is the id).
   *  - The signed Timestamp bounds replay to a 5-minute window.
   *  - Each signature is single-use (in-memory replay cache; single PM2
   *    worker — revisit with a DB table if we ever shard auth horizontally).
   *  - Auto-provisioned wallet users get a random unguessable password so the
   *    account can never be logged into via the password flow.
   *
   * Follow-up (documented in TODO): move to server-issued nonces so replay is
   * impossible even inside the freshness window.
   */
  async loginUserWithWallet(validatedData: { wallet_address: string; signature: string; message: string }) {
    return AutonomousTaskExecutor.execute(
      { type: 'Wallet Login', impact: 'low', module: 'Auth' },
      async () => {
        const parsed = parseWalletLoginMessage(validatedData.message);
        if (!parsed) {
          throw new AuthError('Invalid signature message', 401);
        }
        if (parsed.address !== validatedData.wallet_address) {
          throw new AuthError('Wallet address does not match signed message', 401);
        }

        const now = Date.now();
        if (
          parsed.timestamp > now + WALLET_LOGIN_MAX_FUTURE_SKEW_MS ||
          parsed.timestamp < now - WALLET_LOGIN_MAX_AGE_MS
        ) {
          throw new AuthError('Signature expired, please sign a fresh message', 401);
        }

        const publicKeyRaw = base58Decode(parsed.address);
        const signatureRaw = base58Decode(validatedData.signature);
        if (!publicKeyRaw || !signatureRaw) {
          throw new AuthError('Invalid signature', 401);
        }
        if (!verifyEd25519(publicKeyRaw, Buffer.from(validatedData.message, 'utf8'), signatureRaw)) {
          throw new AuthError('Invalid signature', 401);
        }

        // Replay protection: a signed message is a one-time login ticket.
        const sigHash = crypto.createHash('sha256').update(validatedData.signature).digest('hex');
        pruneWalletReplays(now);
        if (walletLoginReplays.has(sigHash)) {
          throw new AuthError('Signature already used', 401);
        }
        walletLoginReplays.set(sigHash, now + WALLET_REPLAY_TTL_MS);

        let user = await prisma.users.findFirst({
          where: { wallet_address: parsed.address },
          include: { user_profiles: true },
        });

        if (!user) {
          // Auto-provision, mirroring registerUser's onboarding minus the
          // verification email (wallet accounts own synthetic mailboxes).
          const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
          const created = await prisma.users.create({
            data: {
              name: `wallet_${parsed.address.slice(0, 8)}`,
              email: `${parsed.address}@wallet.fwber.local`,
              password: randomPassword,
              role: 'user',
              tier: 'free',
              wallet_address: parsed.address,
              referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            },
            include: { user_profiles: true },
          });
          user = created;

          await prisma.user_profiles.create({
            data: {
              user_id: created.id,
              display_name: created.name,
              preferences: JSON.stringify({
                age_min: 21,
                age_max: 45,
                distance_max: 25,
                show_me: 'all',
                drinking: 'any',
                smoking: 'any',
                education: 'any',
              }),
              looking_for: JSON.stringify(['dating', 'friendship']),
              interests: JSON.stringify([]),
              languages: JSON.stringify(['English']),
            },
          });

          // Welcome bonus parity with email registration (50 FWB tokens).
          await prisma.users.update({ where: { id: created.id }, data: { token_balance: 50 } });
          try {
            await prisma.wallet_transactions.create({
              data: { user_id: created.id, amount: 50, type: 'reward', description: 'Welcome bonus — 50 free tokens!', created_at: new Date() },
            });
          } catch (_) { /* best-effort, parity with registerUser */ }

          try {
            const notifTypes = ['new_match', 'new_message', 'friend_request', 'event_invitation', 'gift_received', 'profile_view', 'achievement_unlocked', 'daily_reminder', 'marketing', 'proximity_alert'];
            await prisma.notification_preferences.createMany({
              data: notifTypes.map((type) => ({ user_id: created.id, type, mail: true, push: true, database: true })),
            });
          } catch (_) { /* best-effort, parity with registerUser */ }
        }

        const token = this.generateToken(user as any);
        const hydrated = await this.hydrateUser(user);
        return { token, user: hydrated };
      },
      // failOpen parity with loginUser: wallet logins must never be gated by
      // system-health state (see CHANGELOG 2.3.39).
      { failOpen: true }
    );
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return; // Silent success

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.password_reset_tokens.upsert({
      where: { email_user_id: { email: user.email!, user_id: user.id } },
      create: {
        email: user.email!,
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
      update: {
        token,
        expires_at: expiresAt,
      },
    });

    try {
      await prisma.password_reset_tokens.deleteMany({
        where: { expires_at: { lt: new Date() } },
      });
    } catch (_) {}

    try {
      await sendPasswordResetEmail(user.email!, token);
    } catch (err) {
      console.error('[Auth] Failed to send password reset email:', err);
    }
  }

  async executePasswordReset(resetData: any) {
    const resetRecord = await prisma.password_reset_tokens.findFirst({
      where: { token: resetData.token },
    });

    if (!resetRecord || resetRecord.expires_at < new Date()) {
      if (resetRecord) {
        await prisma.password_reset_tokens.delete({
          where: { email_user_id: { email: resetRecord.email, user_id: resetRecord.user_id } },
        }).catch(() => {});
      }
      throw new AuthError('Invalid or expired reset token', 400);
    }

    const hashedPassword = await bcrypt.hash(resetData.password, 10);

    await prisma.users.update({
      where: { id: resetRecord.user_id },
      data: { password: hashedPassword },
    });

    await prisma.password_reset_tokens.delete({
      where: { email_user_id: { email: resetRecord.email, user_id: resetRecord.user_id } },
    }).catch(() => {});
  }
}
