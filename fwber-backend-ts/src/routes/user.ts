import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma, { serialize, sanitizeUser } from '../lib/prisma.js';
import { filePathToUrl } from '../lib/photos.js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { sendNotificationEmail } from '../lib/email.js';
import { checkAndUnlockAchievements } from '../lib/achievements.js';

const router = Router();

/**
 * GET /api/user — Current user + flattened `profile` object (`EnhancedProfileEditor.tsx`).
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { user_profiles: true },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const rawProfile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
    const clean = sanitizeUser(serialize(user));
    return res.json({
      ...clean,
      profile: rawProfile ? serialize(rawProfile) : {},
    });
  } catch (err: any) {
    console.error('[user] GET / error:', err.message);
    return res.status(500).json({ message: 'Failed to load user profile' });
  }
});

/**
 * PUT /api/user/profile — Update profile fields via `/api/user/profile` (`EnhancedProfileEditor.tsx`).
 */
router.put('/profile', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const body = req.body || {};

    const allowedScalarFields = [
      'display_name',
      'gender',
      'pronouns',
      'sexual_orientation',
      'relationship_style',
      'bio',
      'location_description',
      'love_language',
      'personality_type',
      'political_views',
      'religion',
      'sleep_schedule',
      'smoking_status',
      'drinking_status',
      'cannabis_status',
      'dietary_preferences',
      'zodiac_sign',
      'relationship_goals',
      'body_type',
      'hair_color',
      'eye_color',
      'skin_tone',
      'facial_hair',
      'dominant_hand',
      'fitness_level',
      'clothing_style',
      'ethnicity',
      'occupation',
      'education',
      'relationship_status',
      'preferred_language',
    ] as const;

    const allowedJsonFields = [
      'looking_for',
      'interests',
      'languages',
      'interested_in',
      'fetishes',
      'sti_status',
      'social_media',
      'preferences',
    ] as const;

    const data: Record<string, any> = { updated_at: new Date() };
    for (const key of allowedScalarFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    for (const key of allowedJsonFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.height_cm !== undefined) {
      data.height_cm = body.height_cm === null || body.height_cm === '' ? null : Number(body.height_cm);
    }
    if (body.subscription_price !== undefined) {
      data.subscription_price = body.subscription_price === null || body.subscription_price === '' ? null : Number(body.subscription_price);
    }
    for (const boolKey of ['has_children', 'wants_children', 'has_pets', 'is_travel_mode', 'is_incognito'] as const) {
      if (typeof body[boolKey] === 'boolean') data[boolKey] = body[boolKey];
    }
    const dobRaw = body.birthdate || body.date_of_birth;
    if (dobRaw && !isNaN(new Date(dobRaw).getTime())) {
      const dob = new Date(dobRaw);
      data.birthdate = dob;
      data.date_of_birth = dob;
    }

    const existing = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    const updatedProfile = existing
      ? await prisma.user_profiles.update({ where: { id: existing.id }, data })
      : await prisma.user_profiles.create({ data: { user_id: userId, created_at: new Date(), ...data } });

    if (body.display_name && typeof body.display_name === 'string') {
      await prisma.users.update({
        where: { id: userId },
        data: { name: body.display_name.trim().slice(0, 120) },
      }).catch(() => {});
    }

    return res.json(serialize(updatedProfile));
  } catch (err: any) {
    console.error('[user] PUT /profile error:', err.message);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Helper: generate recovery codes
function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// Helper: get TOTP URI
function getTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'fwber', secret);
}

// POST /api/user/two-factor-authentication — Enable 2FA (generate secret)
router.post('/two-factor-authentication', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const secret = authenticator.generateSecret();

    await prisma.users.update({
      where: { id: userId },
      data: { two_factor_secret: secret, two_factor_confirmed_at: null },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[2fa] enable error:', err);
    res.status(500).json({ message: 'Failed to enable two-factor authentication' });
  }
});

// GET /api/user/two-factor-qr-code — Get QR code as SVG and URL
router.get('/two-factor-qr-code', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user?.two_factor_secret) {
      return res.status(400).json({ message: 'Two-factor authentication not initiated' });
    }

    const otpauth = getTotpUri(user.email || 'user', user.two_factor_secret);
    const svg = await QRCode.toString(otpauth, { type: 'svg', width: 200 });

    res.json({ svg, url: otpauth, secret: user.two_factor_secret });
  } catch (err) {
    console.error('[2fa] qr error:', err);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// POST /api/user/confirmed-two-factor-authentication — Confirm 2FA with OTP code
router.post('/confirmed-two-factor-authentication', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { code } = req.body;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user?.two_factor_secret) {
      return res.status(400).json({ message: 'Two-factor authentication not initiated' });
    }

    const isValid = authenticator.verify({ token: code, secret: user.two_factor_secret });
    if (!isValid) {
      return res.status(422).json({ message: 'Invalid verification code' });
    }

    // Generate recovery codes and confirm
    const recoveryCodes = generateRecoveryCodes();

    await prisma.users.update({
      where: { id: userId },
      data: {
        two_factor_confirmed_at: new Date(),
        two_factor_recovery_codes: JSON.stringify(recoveryCodes),
      },
    });

    res.json({ success: true, recovery_codes: recoveryCodes });
  } catch (err) {
    console.error('[2fa] confirm error:', err);
    res.status(500).json({ message: 'Failed to confirm two-factor authentication' });
  }
});

// GET /api/user/two-factor-recovery-codes — Get recovery codes
router.get('/two-factor-recovery-codes', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({ where: { id: userId } });

    if (!user?.two_factor_confirmed_at) {
      return res.status(400).json({ message: 'Two-factor authentication not enabled' });
    }

    const codes = user.two_factor_recovery_codes
      ? JSON.parse(user.two_factor_recovery_codes)
      : [];

    res.json({ recovery_codes: codes });
  } catch (err) {
    console.error('[2fa] get recovery codes error:', err);
    res.status(500).json({ message: 'Failed to fetch recovery codes' });
  }
});

// POST /api/user/two-factor-recovery-codes — Regenerate recovery codes
router.post('/two-factor-recovery-codes', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({ where: { id: userId } });

    if (!user?.two_factor_confirmed_at) {
      return res.status(400).json({ message: 'Two-factor authentication not enabled' });
    }

    const recoveryCodes = generateRecoveryCodes();

    await prisma.users.update({
      where: { id: userId },
      data: { two_factor_recovery_codes: JSON.stringify(recoveryCodes) },
    });

    res.json({ recovery_codes: recoveryCodes });
  } catch (err) {
    console.error('[2fa] regenerate recovery codes error:', err);
    res.status(500).json({ message: 'Failed to regenerate recovery codes' });
  }
});

// DELETE /api/user/two-factor-authentication — Disable 2FA
router.delete('/two-factor-authentication', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    await prisma.users.update({
      where: { id: userId },
      data: {
        two_factor_secret: null,
        two_factor_recovery_codes: null,
        two_factor_confirmed_at: null,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[2fa] disable error:', err);
    res.status(500).json({ message: 'Failed to disable two-factor authentication' });
  }
});

// GET /api/user/checkin - Daily check-in status
router.get('/checkin', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { current_streak: true, last_daily_bonus_at: true, token_balance: true },
    });

    if (!user) {
      return res.json({ checked_in: false, streak: 0, tokens_earned: 0, message: 'User not found' });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastBonus = user.last_daily_bonus_at ? new Date(user.last_daily_bonus_at) : null;
    const checkedIn = lastBonus ? lastBonus >= today : false;

    res.json({
      checked_in: checkedIn,
      streak: Number(user.current_streak || 0),
      tokens_earned: checkedIn ? 10 : 0,
      token_balance: Number(user.token_balance || 0),
      message: checkedIn ? 'Already checked in today!' : 'Not yet checked in today',
    });
  } catch (error: any) {
    console.error('[Checkin] Status error:', error.message);
    res.json({ checked_in: false, streak: 0, tokens_earned: 0, message: 'Error checking status' });
  }
});

// POST /api/user/checkin - Perform daily check-in
router.post('/checkin', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { current_streak: true, last_daily_bonus_at: true, token_balance: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastBonus = user.last_daily_bonus_at ? new Date(user.last_daily_bonus_at) : null;

    if (lastBonus && lastBonus >= today) {
      return res.json({
        checked_in: true,
        streak: Number(user.current_streak || 0),
        tokens_earned: 0,
        token_balance: Number(user.token_balance || 0),
        message: 'Already checked in today!',
      });
    }

    // Calculate streak
    let newStreak = 1;
    if (lastBonus) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastBonus >= yesterday) {
        // Consecutive day
        newStreak = Number(user.current_streak || 0) + 1;
      }
    }

    // Calculate tokens based on streak
    const baseTokens = 10;
    const streakBonus = Math.min(newStreak - 1, 10) * 2; // +2 per streak day, max +20
    const totalTokens = baseTokens + streakBonus;

    // Update user and record transaction
    await prisma.users.update({
      where: { id: userId },
      data: {
        current_streak: newStreak,
        last_daily_bonus_at: new Date(),
        token_balance: { increment: totalTokens },
      },
    });

    // Record wallet transaction
    try {
      await prisma.wallet_transactions.create({
        data: {
          user_id: userId,
          amount: totalTokens,
          type: 'reward',
          description: newStreak > 1 ? `${newStreak}-day streak bonus` : 'Daily check-in reward',
          created_at: new Date(),
        },
      });
    } catch (_) {}

    // Check achievements (daily checkin, streak milestones)
    checkAndUnlockAchievements(userId).catch(() => {});

    res.json({
      checked_in: true,
      streak: newStreak,
      tokens_earned: totalTokens,
      token_balance: Number(user.token_balance || 0) + totalTokens,
      message: newStreak > 1
        ? `${newStreak}-day streak! Earned ${totalTokens} tokens!`
        : `Check-in successful! Earned ${totalTokens} tokens!`,
    });
  } catch (error: any) {
    console.error('[Checkin] Error:', error.message);
    res.status(500).json({ message: 'Failed to check in' });
  }
});

// GET /api/user/me - Get current user info
router.get('/me', authenticate, async (req: any, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(req.user.id) },
      select: { id: true, email: true, created_at: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});


// GET /api/user/search — search users with filters
router.get('/search', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const q = String(req.query.q || '').trim();
    const gender = String(req.query.gender || '').trim();
    const ageMin = parseInt(String(req.query.age_min || '0')) || 0;
    const ageMax = parseInt(String(req.query.age_max || '0')) || 0;
    const verified = req.query.verified === 'true';
    const online = req.query.online === 'true';
    const hasPhotos = req.query.has_photos === 'true';
    const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 50);

    // Build profile-level filters
    const profileFilters: any[] = [];
    if (gender) profileFilters.push({ gender });
    // Age filters handled via raw SQL since age is computed from date_of_birth
    // profileFilters is used only for gender and verified which Prisma supports
    if (verified) profileFilters.push({ is_verified: true });

    // Build where clause
    const where: any = { id: { not: userId } };

    // Text search OR conditions
    if (q.length >= 1) {
      where.OR = [
        { name: { contains: q } },
        { user_profiles: { some: { display_name: { contains: q } } } },
        { user_profiles: { some: { bio: { contains: q } } } },
        { user_profiles: { some: { occupation: { contains: q } } } },
      ];
    }

    // Profile filters combined with text search — use raw SQL for MySQL compatibility
    if ((profileFilters.length > 0 || ageMin > 0 || ageMax > 0) && q.length >= 1) {
      const ageMinSql = ageMin > 0 ? `AND TIMESTAMPDIFF(YEAR, p.date_of_birth, NOW()) >= ${ageMin}` : '';
      const ageMaxSql = ageMax > 0 ? `AND TIMESTAMPDIFF(YEAR, p.date_of_birth, NOW()) <= ${ageMax}` : '';
      const genderSql = gender ? `AND p.gender = '${gender.replace(/'/g, "")}'` : '';
      const verifiedSql = verified ? 'AND p.is_verified = 1' : '';
      const qEscaped = q.replace(/'/g, "").replace(/%/g, "").replace(/_/g, "");
      const qSql = `AND (u.name LIKE '%${qEscaped}%' OR p.display_name LIKE '%${qEscaped}%' OR p.bio LIKE '%${qEscaped}%' OR p.occupation LIKE '%${qEscaped}%')`;
      const onlineSql = online ? 'AND u.last_active > DATE_SUB(NOW(), INTERVAL 15 MINUTE)' : '';
      const photosSql = hasPhotos ? 'AND EXISTS (SELECT 1 FROM photos ph WHERE ph.user_id = u.id)' : '';

      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT u.id, u.name, p.display_name, p.avatar_url,
               TIMESTAMPDIFF(YEAR, p.date_of_birth, NOW()) as age,
               p.gender, p.bio, p.occupation,
               p.is_verified, p.is_id_verified
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id != ?
          ${qSql} ${genderSql} ${ageMinSql} ${ageMaxSql} ${verifiedSql} ${onlineSql} ${photosSql}
        ORDER BY p.is_verified DESC, u.name ASC
        LIMIT ?
      `, userId.toString(), limit);

      const results = rows.map((r: any) => ({
        id: Number(r.id),
        name: r.name,
        display_name: r.display_name || r.name,
        avatar_url: r.avatar_url || null,
        age: r.age ? Number(r.age) : null,
        gender: r.gender || null,
        bio: r.bio || null,
        occupation: r.occupation || null,
        is_verified: Boolean(r.is_verified),
        is_id_verified: Boolean(r.is_id_verified),
      }));
      return res.json(results);
    }

    // No text search — use Prisma for gender/verified, or raw SQL for age filters
    if (ageMin > 0 || ageMax > 0) {
      // Age requires raw SQL since age is computed from date_of_birth
      const ageMinSql = ageMin > 0 ? `AND TIMESTAMPDIFF(YEAR, p.date_of_birth, NOW()) >= ${ageMin}` : '';
      const ageMaxSql = ageMax > 0 ? `AND TIMESTAMPDIFF(YEAR, p.date_of_birth, NOW()) <= ${ageMax}` : '';
      const genderSql = gender ? `AND p.gender = '${gender.replace(/'/g, "")}'` : '';
      const verifiedSql = verified ? 'AND p.is_verified = 1' : '';
      const onlineSql = online ? 'AND u.last_active > DATE_SUB(NOW(), INTERVAL 15 MINUTE)' : '';
      const photosSql = hasPhotos ? 'AND EXISTS (SELECT 1 FROM photos ph WHERE ph.user_id = u.id)' : '';

      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT u.id, u.name, p.display_name, p.avatar_url,
               TIMESTAMPDIFF(YEAR, p.date_of_birth, NOW()) as age,
               p.gender, p.bio, p.occupation, p.is_verified, p.is_id_verified
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id != ?
          ${genderSql} ${ageMinSql} ${ageMaxSql} ${verifiedSql} ${onlineSql} ${photosSql}
        ORDER BY p.is_verified DESC, u.name ASC
        LIMIT ?
      `, userId.toString(), limit);

      const results = rows.map((r: any) => ({
        id: Number(r.id),
        name: r.name,
        display_name: r.display_name || r.name,
        avatar_url: r.avatar_url || null,
        age: r.age ? Number(r.age) : null,
        gender: r.gender || null,
        bio: r.bio || null,
        occupation: r.occupation || null,
        is_verified: Boolean(r.is_verified),
        is_id_verified: Boolean(r.is_id_verified),
      }));
      return res.json(results);
    }
    if (profileFilters.length > 0) {
      where.user_profiles = { some: { AND: profileFilters } };
    }

    const users = await prisma.users.findMany({
      where,
      include: {
        user_profiles: { select: { display_name: true, avatar_url: true, date_of_birth: true, gender: true, bio: true, occupation: true, is_verified: true, is_id_verified: true }, take: 1 },
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    res.json(users.map((u: any) => {
      const profile = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
      return {
        id: Number(u.id),
        name: u.name,
        display_name: profile?.display_name || u.name,
        avatar_url: profile?.avatar_url || null,
        age: profile?.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        gender: profile?.gender || null,
        bio: profile?.bio || null,
        occupation: profile?.occupation || null,
        is_verified: profile?.is_verified || false,
        is_id_verified: profile?.is_id_verified || false,
      };
    }));
  } catch (error: any) {
    console.error('[User] Search error:', error.message);
    res.json([]);
  }
});


// POST /api/user/export - GDPR data export
router.post('/export', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        photos: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch related data separately for resilience
    let recentMessages: any[] = [];
    let recentMatches: any[] = [];

    try {
      recentMessages = await prisma.messages.findMany({
        where: { sender_id: userId },
        take: 100,
        orderBy: { created_at: 'desc' },
        select: { content: true, created_at: true },
      });
    } catch (_) {}

    try {
      const m1 = await prisma.matches.findMany({
        where: { user1_id: userId },
        take: 25,
        orderBy: { created_at: 'desc' },
        select: { user2_id: true, status: true, created_at: true },
      });
      const m2 = await prisma.matches.findMany({
        where: { user2_id: userId },
        take: 25,
        orderBy: { created_at: 'desc' },
        select: { user1_id: true, status: true, created_at: true },
      });
      recentMatches = [
        ...m1.map((m: any) => ({ partner_id: Number(m.user2_id), date: m.created_at, status: m.status })),
        ...m2.map((m: any) => ({ partner_id: Number(m.user1_id), date: m.created_at, status: m.status })),
      ];
    } catch (_) {}

    // Structure the data for export
    const exportData = {
      account: {
        id: user.id.toString(),
        email: user.email,
        created_at: user.created_at,
        last_seen_at: user.last_seen_at
      },
      profile: user.user_profiles?.[0] || {},
      photos: user.photos.map(p => ({
        url: filePathToUrl(p.file_path),
        is_primary: p.is_primary,
        created_at: p.created_at
      })),
      recent_messages: recentMessages.map((m: any) => ({
        content: m.content,
        timestamp: m.created_at
      })),
      recent_matches: recentMatches,
    };

    // Send email notification (lightweight summary, not full JSON)
    try {
      const summaryBody = `
        <h1>Your FWBer Data Export</h1>
        <p>Hello, you requested an export of your personal data.</p>
        <p>Your data export includes:</p>
        <ul>
          <li>Account information</li>
          <li>Profile data</li>
          <li>${exportData.photos.length} photos</li>
          <li>${exportData.recent_messages.length} recent messages</li>
          <li>${exportData.recent_matches.length} matches</li>
        </ul>
        <p>You can download your full data from the Settings page.</p>
        <p>If you did not request this, please secure your account immediately.</p>
      `;
      await sendNotificationEmail(
        user.email || '',
        'FWBer Data Export Request',
        summaryBody
      );
    } catch (emailErr) {
      console.error('[export] Failed to send email notification:', emailErr);
    }

    // Return the export data directly so the frontend can download it
    res.json({
      message: 'Data export generated successfully.',
      status: 'completed',
      data: exportData,
    });
  } catch (err) {
    console.error('[export] error:', err);
    res.status(500).json({ message: 'Failed to process data export' });
  }
});

// GET /api/user/export/status - Export status
router.get('/export/status', authenticate, async (_req: any, res) => {
  res.json({ status: 'none', message: 'No export in progress' });
});

export default router;
