import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET /api/premium/who-likes-you - Users who liked current user
router.get('/who-likes-you', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  try {
    // Return people who liked us (match_actions with type 'like' where target is us)
    const likes = await prisma.match_actions.findMany({
      where: {
        target_user_id: userId,
        action: { in: ['like', 'super_like'] }
      },
      include: {
        users_match_actions_user_idTousers: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            user_profiles: {
              select: {
                bio: true,
          avatar_url: true, display_name: true, date_of_birth: true, gender: true
              }
            }
          }
        }
      },
      take: 50
    });

    const users = likes.map((l: any) => {
      const u = l.users_match_actions_user_idTousers;
      const p = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
      const age = p?.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      return {
        id: Number(u.id),
        name: p?.display_name || u.name,
        avatar_url: p?.avatar_url || u.avatar_url,
        bio: p?.bio,
        age,
        action_type: l.action,
        created_at: l.created_at?.toISOString(),
        gender: p?.gender || null,
      };
    });
    res.json({ users, total: users.length });
  } catch (error: any) {
    console.error('[Premium] Who-likes-you error:', error.message);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// GET /api/premium/status - Premium subscription status
router.get('/status', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        tier_expires_at: true,
        unlimited_swipes: true
      }
    });

    res.json({
      is_premium: user?.tier !== 'free',
      plan: user?.tier,
      expires_at: user?.tier_expires_at,
      features: user?.unlimited_swipes ? ['unlimited_swipes', 'who_likes_you', 'boost_multiplier'] : [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /api/premium/initiate - Initiate premium subscription via Stripe
router.post('/initiate', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { planId } = req.body || {}; // monthly, yearly

  if (!stripe) {
    return res.status(501).json({ error: 'Stripe is not configured on the server' });
  }

  const plans = {
    monthly: { usd: 1999, name: 'fwber Premium Monthly' },
    yearly: { usd: 14999, name: 'fwber Premium Yearly' }
  };

  const selectedPlan = plans[planId as keyof typeof plans] || plans.monthly;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: 'Unlock all premium features including "Who Likes You" and unlimited swipes.',
            },
            unit_amount: selectedPlan.usd,
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Or 'subscription' if using Stripe products/prices
      success_url: `${process.env.FRONTEND_URL || 'https://www.fwber.site'}/premium?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://www.fwber.site'}/premium?canceled=true`,
      metadata: {
        userId: userId.toString(),
        type: 'premium_upgrade',
        planId: planId
      }
    });

    res.json({ success: true, checkoutUrl: session.url });
  } catch (error) {
    console.error('[PREMIUM_INITIATE_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/premium/purchase - Purchase premium with tokens
router.post('/purchase', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { planId, plan } = req.body;
  const planKey = planId || plan || 'monthly';
  const tokenCosts: Record<string, number> = { monthly: 500, yearly: 4000, gold: 500, silver: 200, platinum: 4000, trial: 50, weekly: 100 };
  const cost = tokenCosts[planKey] || tokenCosts['monthly'] || 500;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({ where: { id: userId } });
      if (!user || Number(user.token_balance) < cost) {
        throw new Error('Insufficient tokens');
      }
      await tx.users.update({
        where: { id: userId },
        data: {
          token_balance: { decrement: cost },
          tier: 'gold' as any,
          unlimited_swipes: true,
          tier_expires_at: new Date(Date.now() + ((planKey === 'yearly' || planKey === 'platinum') ? 365 : 30) * 24 * 60 * 60 * 1000)
        }
      });
      try {
        await tx.wallet_transactions.create({
          data: {
            user_id: userId,
            amount: -cost,
            type: 'spend',
            description: `Premium ${planKey === 'yearly' ? 'Yearly' : (planKey === 'platinum' ? 'Platinum' : 'Monthly')} subscription`,
            created_at: new Date(),
          },
        });
      } catch (_) {}
      return { success: true };
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/premium/cancel - Cancel premium
router.post('/cancel', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  try {
    await prisma.users.update({
      where: { id: userId },
      data: {
        tier: 'free',
        unlimited_swipes: false,
        tier_expires_at: null
      }
    });
    res.json({ message: 'Subscription cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});


// GET /api/premium/plans — list available premium plans
router.get('/plans', async (req: any, res) => {
  res.json({
    plans: [
      {
        id: 'gold',
        name: 'Gold',
        price: 19.99,
        currency: 'USD',
        interval: 'month',
        token_price: 200,
        features: ['unlimited_swipes', 'who_likes_you', 'boost_multiplier', 'advanced_filters', 'travel_mode', 'incognito_mode'],
        feature_labels: {
          unlimited_swipes: 'Unlimited Likes',
          who_likes_you: 'See Who Likes You',
          boost_multiplier: 'Boost Multiplier',
          advanced_filters: 'Advanced Filters',
          travel_mode: 'Travel Mode',
          incognito_mode: 'Incognito Mode',
        },
        popular: true,
      },
      {
        id: 'platinum',
        name: 'Platinum',
        price: 39.99,
        currency: 'USD',
        interval: 'month',
        token_price: 400,
        features: ['unlimited_swipes', 'who_likes_you', 'boost_multiplier', 'advanced_filters', 'travel_mode', 'incognito_mode', 'priority_likes', 'message_before_match'],
        feature_labels: {
          unlimited_likes: 'Unlimited Likes',
          who_likes_you: 'See Who Likes You',
          boost_multiplier: 'Boost Multiplier',
          advanced_filters: 'Advanced Filters',
          travel_mode: 'Travel Mode',
          incognito_mode: 'Incognito Mode',
          priority_likes: 'Priority Likes',
          message_before_match: 'Message Before Match',
        },
        popular: false,
      },
    ],
  });
});

export default router;
