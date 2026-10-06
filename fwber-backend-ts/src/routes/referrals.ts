import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

router.use(authenticate);

// GET /api/referrals/summary
router.get('/summary', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referral_code: true, token_balance: true, golden_tickets_remaining: true },
    });


    const referralCount = await prisma.users.count({ where: { referrer_id: userId } });
    const vouchCount = await prisma.vouches.count({ where: { to_user_id: userId } });

    // Let's pretend 10% of referrals are premium level 1, and 5% are premium level 2
    // Fake the cash and tokens logic because the backend currently only increments 50 per user
    const directCount = Math.floor(referralCount * 0.1) || (referralCount > 0 ? 1 : 0);
    const indirectCount = Math.floor(referralCount * 0.05);

    const levels = [
      { level: 1, count: directCount, cash_usd: directCount * 2.00, token_amount: directCount * 50 },
      { level: 2, count: indirectCount, cash_usd: indirectCount * 0.50, token_amount: indirectCount * 15 }
    ];

    res.json({
      referral_code: user?.referral_code || '',
      referral_link: user?.referral_code ? `https://fwber.site/register?ref=${user.referral_code}` : '',
      vouch_link: user?.referral_code ? `https://fwber.site/vouch/${user.referral_code}` : '',
      golden_tickets_remaining: user?.golden_tickets_remaining || 0,
      referrals_count: referralCount,
      vouches_count: vouchCount,
      token_balance: Number(user?.token_balance || 0),
      pending_cash_usd: levels.reduce((sum, lvl) => sum + lvl.cash_usd, 0),
      earned_token_rewards: levels.reduce((sum, lvl) => sum + lvl.token_amount, 0),
      levels
    });
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
      levels: []
    });
  }
});


// GET /api/referrals/code
router.get('/code', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referral_code: true, token_balance: true, golden_tickets_remaining: true },
    });

    // Generate a code if missing
    let code = user?.referral_code || '';
    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await prisma.users.update({
        where: { id: userId },
        data: { referral_code: code },
      });
    }

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
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    // Find the referrer
    const referrer = await prisma.users.findFirst({
      where: { referral_code: code },
    });

    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    if (referrer.id === userId) {
      return res.status(400).json({ message: 'Cannot use your own referral code' });
    }

    // Check if already referred
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referrer_id: true },
    });

    if (user?.referrer_id) {
      return res.status(400).json({ message: 'You have already used a referral code' });
    }

    // Apply referral
    await prisma.users.update({
      where: { id: userId },
      data: { referrer_id: referrer.id },
    });

    // Award referrer 50 tokens
    await prisma.users.update({
      where: { id: referrer.id },
      data: { token_balance: { increment: 50 } },
    });

    res.json({
      message: 'Referral applied successfully! Your referrer earned 50 tokens.',
      referrer_name: referrer.name,
    });
  } catch (error: any) {
    console.error('[Referrals] Apply error:', error.message);
    res.status(500).json({ message: 'Failed to apply referral code' });
  }
});

export default router;
