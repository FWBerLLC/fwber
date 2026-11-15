import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /api/subscriptions
router.get('/', async (req: any, res) => {
  try {
    const subs = await prisma.subscriptions.findMany({
      where: { user_id: BigInt(req.user.id) }, orderBy: { created_at: 'desc' }
    });
    res.json(subs.map((s: any) => ({
      id: Number(s.id), name: s.name, stripe_status: s.stripe_status,
      stripe_price: s.stripe_price, ends_at: s.ends_at, created_at: s.created_at
    })));
  } catch (err: any) { res.json([]); }
});

// GET /api/subscriptions/history
router.get('/history', async (req: any, res) => {
  try {
    const payments = await prisma.payments.findMany({
      where: { user_id: BigInt(req.user.id), description: { contains: 'Subscription' } },
      orderBy: { created_at: 'desc' }, take: 20
    });
    const data = payments.map((p: any) => ({
      id: Number(p.id), amount: Number(p.amount), currency: p.currency || 'usd',
      status: p.status, description: p.description || 'Premium subscription', created_at: p.created_at
    }));
    res.json({ data, total: data.length });
  } catch (err: any) { res.json({ data: [], total: 0 }); }
});

// GET /api/subscriptions/current
router.get('/current', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const sub = await prisma.subscriptions.findFirst({
      where: { user_id: userId, stripe_status: 'active', ends_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' }
    });
    if (sub) return res.json({ plan: sub.name, status: sub.stripe_status, expires_at: sub.ends_at, stripe_id: sub.stripe_id, source: 'stripe' });
    
    const profiles = await prisma.user_profiles.findMany({ where: { user_id: userId }, take: 1 });
    const profile: any = profiles[0];
    if (profile?.is_premium && profile?.premium_expires_at && new Date() < new Date(profile.premium_expires_at)) {
      return res.json({ plan: 'gold', status: 'active', expires_at: profile.premium_expires_at, source: 'token_purchase' });
    }
    res.json({ plan: 'free', status: 'active', expires_at: null });
  } catch (err: any) { res.json({ plan: 'free', status: 'active', expires_at: null }); }
});

// POST /api/subscriptions/checkout
router.post('/checkout', async (req: any, res) => {
  const { plan } = req.body;
  if (!plan || !['gold_monthly', 'gold_yearly'].includes(plan)) return res.status(422).json({ error: 'Valid plan required' });
  res.json({ message: 'Checkout session', plan, amount: plan === 'gold_yearly' ? 9999 : 999, currency: 'usd', status: 'requires_payment_method' });
});

// POST /api/subscriptions/cancel
router.post('/cancel', async (req: any, res) => {
  try {
    const sub = await prisma.subscriptions.findFirst({ where: { user_id: BigInt(req.user.id), stripe_status: 'active' } });
    if (!sub) return res.status(404).json({ error: 'No active subscription' });
    await prisma.subscriptions.update({ where: { id: sub.id }, data: { stripe_status: 'canceling' } });
    res.json({ message: 'Subscription canceled at period end', expires_at: sub.ends_at, status: 'canceling' });
  } catch (err: any) { res.status(500).json({ error: 'Failed to cancel' }); }
});

/**
 * GET /api/subscriptions/creator/:creatorId
 * Check whether the authenticated user has an active FWB token subscription to `:creatorId`
 * (`ProfileViewModal.tsx`).
 */
router.get('/creator/:creatorId', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const creatorId = BigInt(req.params.creatorId);
    if (userId === creatorId) {
      return res.json({ is_subscribed: true, expires_at: null, is_self: true });
    }

    const active = await prisma.creator_subscriptions.findFirst({
      where: {
        user_id: userId,
        creator_id: creatorId,
        status: 'active',
        expires_at: { gt: new Date() },
      },
    });

    return res.json({
      is_subscribed: Boolean(active),
      expires_at: active?.expires_at?.toISOString() || null,
      cost: active ? Number(active.cost) : null,
    });
  } catch (err: any) {
    console.error('[Subscriptions] Creator status error:', err.message);
    return res.json({ is_subscribed: false, expires_at: null });
  }
});

/**
 * POST /api/subscriptions/creator/:creatorId
 * Atomic 30-day FWB token creator subscription (`ProfileViewModal.tsx`).
 * Debits the subscriber, credits 90% to the creator (10% platform burn/treasury),
 * upserts `creator_subscriptions`, and logs dual `wallet_transactions`.
 */
router.post('/creator/:creatorId', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let creatorId: bigint;
    try {
      creatorId = BigInt(req.params.creatorId);
    } catch {
      return res.status(400).json({ error: 'Invalid creator ID' });
    }

    if (userId === creatorId) {
      return res.status(400).json({ error: 'Cannot subscribe to yourself' });
    }

    const creator = await prisma.users.findUnique({
      where: { id: creatorId },
      include: { user_profiles: { take: 1 } },
    });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const creatorProfile = creator.user_profiles?.[0];
    const rawPrefs = creatorProfile?.preferences;
    const prefs = typeof rawPrefs === 'string'
      ? (() => { try { return JSON.parse(rawPrefs); } catch { return {}; } })()
      : (rawPrefs && typeof rawPrefs === 'object' ? rawPrefs : {});
    const rawPrice = Number(creatorProfile?.subscription_price ?? (prefs as any)?.subscription_price ?? req.body?.price ?? 25);
    const price = Number.isFinite(rawPrice) && rawPrice > 0 ? Math.min(Math.round(rawPrice), 10000) : 25;
    const creatorShare = Math.max(1, Math.floor(price * 0.9));

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.creator_subscriptions.findUnique({
        where: { user_id_creator_id: { user_id: userId, creator_id: creatorId } },
      });
      if (existing && existing.status === 'active' && existing.expires_at > new Date()) {
        return { alreadyActive: true as const, sub: existing, balance: null };
      }

      const subscriber = await tx.users.findUnique({
        where: { id: userId },
        select: { token_balance: true },
      });
      const currentBalance = Number(subscriber?.token_balance || 0);
      if (currentBalance < price) {
        return { insufficient: true as const, balance: currentBalance };
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const updatedSubscriber = await tx.users.update({
        where: { id: userId },
        data: { token_balance: { decrement: price } },
        select: { token_balance: true },
      });

      await tx.users.update({
        where: { id: creatorId },
        data: { token_balance: { increment: creatorShare } },
      });

      const sub = await tx.creator_subscriptions.upsert({
        where: { user_id_creator_id: { user_id: userId, creator_id: creatorId } },
        update: { expires_at: expiresAt, cost: price, status: 'active', updated_at: now },
        create: {
          user_id: userId,
          creator_id: creatorId,
          expires_at: expiresAt,
          cost: price,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      });

      await tx.wallet_transactions.createMany({
        data: [
          {
            user_id: userId,
            amount: -price,
            type: 'creator_subscription',
            description: `30-day Creator Subscription to #${creatorId.toString()}`,
            created_at: now,
            updated_at: now,
          },
          {
            user_id: creatorId,
            amount: creatorShare,
            type: 'creator_earning',
            description: `Creator Subscription revenue from #${userId.toString()}`,
            created_at: now,
            updated_at: now,
          },
        ],
      });

      return {
        alreadyActive: false as const,
        insufficient: false as const,
        sub,
        balance: Number(updatedSubscriber.token_balance || 0),
      };
    });

    if ('insufficient' in outcome && outcome.insufficient) {
      return res.status(402).json({
        error: `Insufficient FWB tokens (need ${price} FWB, have ${outcome.balance} FWB)`,
        required: price,
        token_balance: outcome.balance,
      });
    }

    return res.json({
      success: true,
      is_subscribed: true,
      already_subscribed: outcome.alreadyActive,
      cost: price,
      expires_at: outcome.sub.expires_at.toISOString(),
      new_balance: outcome.balance,
    });
  } catch (err: any) {
    console.error('[Subscriptions] Creator subscribe error:', err.message);
    return res.status(500).json({ error: 'Failed to process creator subscription' });
  }
});

export default router;
