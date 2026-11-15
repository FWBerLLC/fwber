import crypto from 'crypto';
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma, { serialize } from '../lib/prisma.js';

const router = Router();

router.use(authenticate);

const REWARD_RULES = {
  level_1: { cash_usd: 2.0, token_amount: 50 },
  level_2: { cash_usd: 0.5, token_amount: 15 },
  applicant_bonus_tokens: 25,
};

/**
 * Ensures every authenticated member has a unique, deterministic-safe 6-8 char
 * uppercase referral code persisted on `prisma.users.referral_code`.
 * Previously `GET /api/referrals/summary` returned `referral_code: ""` until a
 * separate endpoint (`/code`) was hit, leaving `/referrals` and `ReferralModal`
 * stuck on "Generating your invite link..." for brand-new accounts.
 */
async function ensureUserReferralCode(userId: bigint, currentCode?: string | null): Promise<string> {
  if (currentCode && currentCode.trim().length > 0) {
    return currentCode.trim();
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = crypto.randomBytes(4).toString('hex').toUpperCase();
    const collision = await prisma.users.findFirst({
      where: { referral_code: candidate },
      select: { id: true },
    });
    if (!collision) {
      await prisma.users.update({
        where: { id: userId },
        data: { referral_code: candidate },
      });
      return candidate;
    }
  }

  const fallback = `FWB${userId.toString()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  await prisma.users.update({
    where: { id: userId },
    data: { referral_code: fallback },
  });
  return fallback;
}

async function buildReferralSummary(userId: bigint) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      referral_code: true,
      token_balance: true,
      golden_tickets_remaining: true,
      referrer_id: true,
    },
  });

  const code = user ? await ensureUserReferralCode(userId, user.referral_code) : '';
  const appOrigin = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.online').replace(/\/$/, '');

  // Query real Level-1 and Level-2 referral trees rather than synthetic ratios
  const level1Users = await prisma.users.findMany({
    where: { referrer_id: userId },
    select: { id: true, name: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });

  const level1Ids = level1Users.map((u: any) => u.id);
  const level2Count = level1Ids.length > 0
    ? await prisma.users.count({ where: { referrer_id: { in: level1Ids } } })
    : 0;

  const vouchCount = await prisma.vouches.count({ where: { to_user_id: userId } });

  const directCount = level1Users.length;
  const levels = [
    {
      level: 1,
      count: directCount,
      cash_usd: Number((directCount * REWARD_RULES.level_1.cash_usd).toFixed(2)),
      token_amount: directCount * REWARD_RULES.level_1.token_amount,
    },
    {
      level: 2,
      count: level2Count,
      cash_usd: Number((level2Count * REWARD_RULES.level_2.cash_usd).toFixed(2)),
      token_amount: level2Count * REWARD_RULES.level_2.token_amount,
    },
  ];

  return {
    summary: {
      referral_code: code,
      referral_link: code ? `${appOrigin}/register?ref=${code}` : '',
      vouch_link: code ? `${appOrigin}/vouch/${code}` : '',
      golden_tickets_remaining: Number(user?.golden_tickets_remaining ?? 3),
      referrals_count: directCount,
      level_2_referrals_count: level2Count,
      vouches_count: vouchCount,
      token_balance: Number(user?.token_balance || 0),
      pending_cash_usd: Number(levels.reduce((sum, lvl) => sum + lvl.cash_usd, 0).toFixed(2)),
      earned_token_rewards: levels.reduce((sum, lvl) => sum + lvl.token_amount, 0),
      has_applied_referral: Boolean(user?.referrer_id),
      levels,
      reward_rules: {
        level_1: REWARD_RULES.level_1,
        level_2: REWARD_RULES.level_2,
      },
    },
    level1Users,
    referrerId: user?.referrer_id ?? null,
  };
}

// GET /api/referrals — full referral & vouch feed + summary for /referrals hub
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { summary, level1Users, referrerId } = await buildReferralSummary(userId);

    const [vouches, referredBy] = await Promise.all([
      prisma.vouches.findMany({
        where: { to_user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 25,
      }),
      referrerId
        ? prisma.users.findUnique({
            where: { id: referrerId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    res.json(serialize({
      summary,
      referrals: level1Users.map((u: any) => ({
        id: Number(u.id),
        name: u.name || 'FWBer Member',
        joined_at: u.created_at,
        token_reward: REWARD_RULES.level_1.token_amount,
      })),
      vouches: vouches.map((v: any) => ({
        id: Number(v.id),
        voucher_name: v.voucher_name || 'Verified Friend',
        type: v.type,
        relationship_type: v.relationship_type || null,
        comment: v.comment || null,
        is_verified: Boolean(v.is_verified),
        created_at: v.created_at,
      })),
      referred_by: referredBy ? { id: Number(referredBy.id), name: referredBy.name } : null,
    }));
  } catch (error: any) {
    console.error('[Referrals] Root feed error:', error.message);
    res.json({
      summary: {
        referral_code: '',
        referral_link: '',
        vouch_link: '',
        golden_tickets_remaining: 0,
        referrals_count: 0,
        vouches_count: 0,
        token_balance: 0,
        pending_cash_usd: 0,
        earned_token_rewards: 0,
        has_applied_referral: false,
        levels: [],
        reward_rules: {
          level_1: REWARD_RULES.level_1,
          level_2: REWARD_RULES.level_2,
        },
      },
      referrals: [],
      vouches: [],
      referred_by: null,
    });
  }
});

// GET /api/referrals/summary
router.get('/summary', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { summary } = await buildReferralSummary(userId);
    res.json(summary);
  } catch (error: any) {
    console.error('[Referrals] Summary error:', error.message);
    res.json({
      referral_code: '',
      referral_link: '',
      vouch_link: '',
      golden_tickets_remaining: 0,
      referrals_count: 0,
      vouches_count: 0,
      token_balance: 0,
      pending_cash_usd: 0,
      earned_token_rewards: 0,
      has_applied_referral: false,
      levels: [],
      reward_rules: {
        level_1: REWARD_RULES.level_1,
        level_2: REWARD_RULES.level_2,
      },
    });
  }
});

// GET /api/referrals/code
router.get('/code', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referral_code: true },
    });
    const code = await ensureUserReferralCode(userId, user?.referral_code);
    res.json({ code });
  } catch (error: any) {
    console.error('[Referrals] Code error:', error.message);
    res.json({ code: '' });
  }
});

// POST /api/referrals/apply
router.post('/apply', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const rawCode = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';

    if (!rawCode) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const referrer = await prisma.users.findFirst({
      where: { referral_code: rawCode },
      select: { id: true, name: true },
    });

    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    if (referrer.id === userId) {
      return res.status(400).json({ message: 'Cannot use your own referral code' });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referrer_id: true },
    });

    if (user?.referrer_id) {
      return res.status(400).json({ message: 'You have already used a referral code' });
    }

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
      await tx.users.update({
        where: { id: userId },
        data: {
          referrer_id: referrer.id,
          token_balance: { increment: REWARD_RULES.applicant_bonus_tokens },
        },
      });

      await tx.users.update({
        where: { id: referrer.id },
        data: { token_balance: { increment: REWARD_RULES.level_1.token_amount } },
      });

      if (tx.token_transactions?.create) {
        await tx.token_transactions.create({
          data: {
            user_id: referrer.id,
            amount: REWARD_RULES.level_1.token_amount,
            type: 'referral_bonus',
            description: `Referral bonus for inviting user #${userId.toString()}`,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.token_transactions.create({
          data: {
            user_id: userId,
            amount: REWARD_RULES.applicant_bonus_tokens,
            type: 'referral_welcome',
            description: `Welcome bonus from referral code ${rawCode}`,
            created_at: now,
            updated_at: now,
          },
        });
      }
    });

    res.json({
      success: true,
      message: `Referral applied! You received ${REWARD_RULES.applicant_bonus_tokens} FWB and ${referrer.name || 'your referrer'} earned ${REWARD_RULES.level_1.token_amount} FWB.`,
      referrer_name: referrer.name,
      bonus_tokens: REWARD_RULES.applicant_bonus_tokens,
    });
  } catch (error: any) {
    console.error('[Referrals] Apply error:', error.message);
    res.status(500).json({ message: 'Failed to apply referral code' });
  }
});

export default router;
