import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);
// GET /api/settings/privacy — get all privacy settings
router.get('/privacy', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await prisma.user_profiles.findFirst({
      where: { user_id: userId },
      select: {
        journal_circle_group_id: true,
        is_federated: true,
        is_travel_mode: true,
        is_incognito: true,
      },
    });
    res.json({
      is_incognito: profile?.is_incognito || false,
      is_travel_mode: profile?.is_travel_mode || false,
      is_federated: profile?.is_federated || false,
      journal_privacy: profile?.journal_circle_group_id ? 'circle' : 'private',
      profile_visibility: 'all',
      show_online_status: true,
      show_distance: true,
      show_last_seen: true,
      allow_message_requests: true,
      allow_profile_views: true,
      data_export_enabled: true,
    });
  } catch (error: any) {
    console.error('[Settings] Privacy error:', error.message);
    res.json({});
  }
});

// PUT /api/settings/privacy — update privacy settings
router.put('/privacy', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { is_incognito, is_travel_mode, show_online_status, show_distance, allow_message_requests } = req.body;
    const updates: any = {};
    if (is_incognito !== undefined) updates.is_incognito = Boolean(is_incognito);
    if (is_travel_mode !== undefined) updates.is_travel_mode = Boolean(is_travel_mode);
    if (Object.keys(updates).length > 0) {
      await prisma.user_profiles.updateMany({ where: { user_id: userId }, data: updates });
    }
    res.json({ success: true, updated: Object.keys(req.body) });
  } catch (error: any) {
    console.error('[Settings] Privacy update error:', error.message);
    res.json({ success: false });
  }
});


// Journal privacy settings persist on user_profiles
// (journal_default_visibility + journal_circle_group_id). The previous
// handlers were a facade: GET derived visibility from the circle column
// alone and PUT echoed the request body without saving it (hardcoding
// circle group 1 and swallowing errors), so changes never survived a
// re-read. Both now read/write the real columns, and PUT returns the
// re-read persisted state.
const JOURNAL_VISIBILITIES = ['public', 'friends', 'circle', 'private'];

async function journalPrivacyPayload(userId: bigint) {
  const profile = await prisma.user_profiles.findFirst({
    where: { user_id: userId },
    select: { journal_circle_group_id: true, journal_default_visibility: true },
  });
  const memberships = await prisma.group_members.findMany({
    where: { user_id: userId },
    include: { groups: { select: { id: true, name: true, privacy: true } } },
  });
  const stored = profile?.journal_default_visibility;
  return {
    default_visibility: JOURNAL_VISIBILITIES.includes(stored || '')
      ? stored
      : (profile?.journal_circle_group_id ? 'circle' : 'private'),
    circle_group_id: profile?.journal_circle_group_id ? Number(profile.journal_circle_group_id) : null,
    available_groups: memberships
      .filter((m: any) => m.groups)
      .map((m: any) => ({ id: Number(m.groups.id), name: m.groups.name, privacy: m.groups.privacy })),
    allow_comments: true,
    allow_reactions: true,
    share_with_matches: false,
  };
}

// GET /api/settings/privacy/journals — get journal privacy settings
router.get('/privacy/journals', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    res.json({ data: await journalPrivacyPayload(userId) });
  } catch (error: any) {
    console.error('[Settings] Journal privacy read error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load journal privacy settings' });
  }
});

// PUT /api/settings/privacy/journals — update journal privacy settings
router.put('/privacy/journals', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { default_visibility, circle_group_id } = req.body || {};

    if (default_visibility !== undefined && !JOURNAL_VISIBILITIES.includes(default_visibility)) {
      return res.status(400).json({ message: 'Invalid default_visibility' });
    }

    const data: any = {};
    if (default_visibility !== undefined) data.journal_default_visibility = default_visibility;
    if (circle_group_id !== undefined) {
      data.journal_circle_group_id = circle_group_id === null ? null : BigInt(circle_group_id);
    }

    if (Object.keys(data).length > 0) {
      const existing = await prisma.user_profiles.findFirst({ where: { user_id: userId }, select: { id: true } });
      if (existing) {
        await prisma.user_profiles.update({ where: { id: existing.id }, data });
      } else {
        await prisma.user_profiles.create({ data: { user_id: userId, ...data } });
      }
    }

    res.json({ data: await journalPrivacyPayload(userId) });
  } catch (error: any) {
    console.error('[Settings] Journal privacy update error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update journal privacy settings' });
  }
});

// GET /api/settings — general settings
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        email_verified_at: true,
        two_factor_secret: true,
        two_factor_confirmed_at: true,
        is_moderator: true,
      },
    });
    const profile = await prisma.user_profiles.findFirst({
      where: { user_id: userId },
      select: {
        display_name: true,
        journal_circle_group_id: true,
        occupation: true,
        education: true,
      },
    });
    res.json({
      user: {
        name: user?.name,
        email: user?.email,
        email_verified: !!user?.email_verified_at,
        two_factor_enabled: !!user?.two_factor_confirmed_at,
        is_moderator: user?.is_moderator || false,
      },
      profile: {
        display_name: profile?.display_name,
        journal_privacy: profile?.journal_circle_group_id ? 'circle' : 'private',
        occupation: profile?.occupation,
        education: profile?.education,
      },
    });
  } catch (error: any) {
    res.json({ user: {}, profile: {} });
  }
});


// GET /api/settings/account
router.get('/account', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, email_verified_at: true,
        two_factor_secret: true, two_factor_confirmed_at: true,
        is_moderator: true, created_at: true, last_seen_at: true,
      },
    });
    res.json({
      name: user?.name || '',
      email: user?.email || '',
      email_verified: !!user?.email_verified_at,
      two_factor_enabled: !!user?.two_factor_confirmed_at,
      is_moderator: user?.is_moderator || false,
      created_at: user?.created_at?.toISOString() || null,
      last_seen_at: user?.last_seen_at?.toISOString() || null,
      phone_number: null,
      linked_accounts: [],
    });
  } catch (error: any) {
    res.json({ name: '', email: '', email_verified: false });
  }
});

// PUT /api/settings/account
router.put('/account', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { name, email } = req.body || {};
    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (Object.keys(data).length > 0) {
      await prisma.users.update({ where: { id: userId }, data });
    }
    res.json({ success: true, updated: Object.keys(data) });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/settings/security
router.get('/security', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        two_factor_secret: true, two_factor_confirmed_at: true,
        email: true, email_verified_at: true,
        decoy_password: true, decoy_user_id: true,
      },
    });
    res.json({
      two_factor_enabled: !!user?.two_factor_confirmed_at,
      two_factor_method: user?.two_factor_confirmed_at ? 'app' : null,
      email_verified: !!user?.email_verified_at,
      password_set: true,
      has_decoy_profile: Boolean(user?.decoy_password && user?.decoy_user_id),
      decoy_user_id: user?.decoy_user_id ? Number(user.decoy_user_id) : null,
      login_notifications: true,
      session_timeout_minutes: 60,
      active_sessions: [],
      recovery_codes_generated: false,
    });
  } catch (error: any) {
    res.json({ two_factor_enabled: false, email_verified: false, password_set: true, has_decoy_profile: false });
  }
});

// POST /api/settings/decoy-profile — Configure duress decoy password & linked decoy account
router.post('/decoy-profile', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { decoy_password } = req.body || {};

    if (!decoy_password || String(decoy_password).length < 8) {
      return res.status(400).json({ error: 'Decoy password must be at least 8 characters' });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, password: true, decoy_user_id: true, is_decoy: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.is_decoy) {
      return res.status(403).json({ error: 'Cannot attach a nested decoy to a decoy session' });
    }

    if (user.password && await bcrypt.compare(String(decoy_password), user.password)) {
      return res.status(400).json({ error: 'Decoy password must be different from your primary password' });
    }

    let decoyUserId = user.decoy_user_id;
    if (decoyUserId) {
      const existingDecoy = await prisma.users.findUnique({ where: { id: decoyUserId }, select: { id: true } });
      if (!existingDecoy) decoyUserId = null;
    }

    const now = new Date();
    if (!decoyUserId) {
      const firstName = (user.name || 'Alex').split(/\s+/)[0] || 'Alex';
      const internalEmail = `decoy+${userId}-${crypto.randomBytes(4).toString('hex')}@decoy.fwber.internal`;
      const randomPrimaryHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

      const createdDecoy = await prisma.users.create({
        data: {
          name: firstName,
          email: internalEmail,
          password: randomPrimaryHash,
          is_decoy: true,
          onboarding_completed_at: now,
          created_at: now,
          updated_at: now,
        },
      });
      decoyUserId = createdDecoy.id;

      await prisma.user_profiles.create({
        data: {
          user_id: decoyUserId,
          display_name: firstName,
          bio: 'Just exploring local coffee spots and community events.',
          is_incognito: true,
          created_at: now,
          updated_at: now,
        },
      }).catch(() => {});
    }

    const hashedDecoyPassword = await bcrypt.hash(String(decoy_password), 10);
    await prisma.users.update({
      where: { id: userId },
      data: {
        decoy_password: hashedDecoyPassword,
        decoy_user_id: decoyUserId,
        updated_at: now,
      },
    });

    res.json({
      success: true,
      has_decoy_profile: true,
      decoy_user_id: Number(decoyUserId),
    });
  } catch (error: any) {
    console.error('[POST /settings/decoy-profile]', error.message);
    res.status(500).json({ error: 'Failed to configure decoy profile' });
  }
});

// DELETE /api/settings/decoy-profile — Detach duress decoy password from primary account
router.delete('/decoy-profile', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    await prisma.users.update({
      where: { id: userId },
      data: {
        decoy_password: null,
        decoy_user_id: null,
        updated_at: new Date(),
      },
    });
    res.json({ success: true, has_decoy_profile: false });
  } catch (error: any) {
    console.error('[DELETE /settings/decoy-profile]', error.message);
    res.status(500).json({ error: 'Failed to detach decoy profile' });
  }
});

// GET /api/settings/notifications
router.get('/notifications', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const prefs = await prisma.notification_preferences.findMany({
      where: { user_id: userId },
    });
    res.json({
      preferences: prefs.map((p: any) => ({
        type: p.type || p.notification_type,
        mail: !!p.mail,
        push: !!p.push,
        in_app: (p.in_app !== false),
      })),
      quiet_hours_start: null,
      quiet_hours_end: null,
      digest_frequency: 'daily',
    });
  } catch (error: any) {
    res.json({ preferences: [], digest_frequency: 'daily' });
  }
});

// GET /api/settings/subscription
router.get('/subscription', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const subs = await prisma.subscriptions.findMany({
      where: { user_id: userId },
      take: 1,
      orderBy: { created_at: 'desc' },
    });
    const sub = subs[0] as any;
    const planType = sub?.name?.toLowerCase() || 'free';
    const isActive = !!sub && sub.stripe_status === 'active';
    res.json({
      is_premium: isActive,
      plan: planType,
      status: isActive ? 'active' : (sub ? 'expired' : 'none'),
      started_at: sub?.created_at?.toISOString() || null,
      expires_at: sub?.ends_at?.toISOString() || null,
      auto_renew: sub?.trial_ends_at ? true : false,
      features: planType.includes('gold')
        ? ['who_liked_you', 'unlimited_likes', 'boost_monthly', 'see_admirers', 'advanced_filters', 'read_receipts', 'undo_pass']
        : planType.includes('silver')
        ? ['who_liked_you', 'boost_monthly', 'advanced_filters']
        : [],
    });
  } catch (error: any) {
    res.json({ is_premium: false, plan: 'free', status: 'none', features: [] });
  }
});

export default router;
