import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

router.use(authenticate);

// Boost type definitions
const BOOST_TYPES = [
  {
    id: 'standard',
    name: 'Standard Boost',
    description: '30 minutes of increased visibility in discovery',
    tokens: 50,
    usd_cents: 499,
    duration_minutes: 30,
    icon: '🚀',
  },
  {
    id: 'super',
    name: 'Super Boost',
    description: '2 hours of premium placement in all feeds',
    tokens: 100,
    usd_cents: 999,
    duration_minutes: 120,
    icon: '⚡',
  },
];

/**
 * GET /api/boosts — list available boosts + active boost status
 */
router.get('/', async (req, res) => {
  const userId = BigInt((req as any).user.id);
  try {
    const [activeBoost, history] = await Promise.all([
      prisma.boosts.findFirst({
        where: { user_id: userId, status: 'active', expires_at: { gt: new Date() } },
        orderBy: { expires_at: 'desc' },
      }),
      prisma.boosts.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { token_balance: true },
    });

    res.json({
      boosts: BOOST_TYPES.map((b) => ({
        ...b,
        affordable: Number(user?.token_balance || 0) >= b.tokens,
      })),
      active_boost: activeBoost ? {
        id: Number(activeBoost.id),
        type: activeBoost.boost_type,
        started_at: activeBoost.started_at?.toISOString(),
        expires_at: activeBoost.expires_at?.toISOString(),
        minutes_remaining: activeBoost.expires_at ? Math.max(0, Math.round((new Date(activeBoost.expires_at.toString()).getTime() - Date.now()) / 60000)) : 0,
      } : null,
      history: history.map((h: any) => ({
        id: Number(h.id),
        type: h.boost_type,
        status: h.status,
        started_at: h.started_at?.toISOString(),
        expires_at: h.expires_at?.toISOString(),
      })),
      token_balance: Number(user?.token_balance || 0),
    });
  } catch (error: any) {
    console.error('[GET /boosts]', error.message);
    res.json({ boosts: BOOST_TYPES, active_boost: null, history: [], token_balance: 0 });
  }
});

/**
 * POST /api/boosts/purchase
 * Handles boost purchases via Tokens or Stripe
 */
router.post('/purchase', async (req, res) => {
  const userId = BigInt((req as any).user.id);
  const { type, boost_type, paymentMethod } = req.body;

  const boostType = type || boost_type;
    const selectedPrice = BOOST_TYPES.find(b => b.id === boostType);
  if (!selectedPrice) {
    return res.status(400).json({ error: 'Invalid boost type' });
  }

  try {
    if (paymentMethod === 'token') {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { token_balance: true },
      });

      if (!user || Number(user.token_balance) < selectedPrice.tokens) {
        return res.status(400).json({ error: 'Insufficient token balance' });
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.users.update({
          where: { id: userId },
          data: { token_balance: { decrement: selectedPrice.tokens } },
        });

        try {
          await tx.wallet_transactions.create({
            data: {
              user_id: userId,
              amount: -selectedPrice.tokens,
              type: 'spend',
              description: `${selectedPrice.name} (${selectedPrice.duration_minutes} min)`,
              created_at: new Date(),
            },
          });
        } catch (_) {}

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + selectedPrice.duration_minutes);

        return await tx.boosts.create({
          data: {
            user_id: userId,
            boost_type: boostType as any,
            status: 'active',
            started_at: new Date(),
            expires_at: expiresAt,
          },
        });
      });

      return res.json({ success: true, boost: result });
    } else if (paymentMethod === 'stripe') {
      if (!stripe) {
        return res.status(501).json({ error: 'Stripe is not configured on the server' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${type.toUpperCase()} Boost - fwber`,
                description: `${selectedPrice.duration_minutes} minutes of increased visibility`,
              },
              unit_amount: selectedPrice.usd_cents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'https://www.fwber.site'}/boosts?success=true`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://www.fwber.site'}/boosts?canceled=true`,
        metadata: {
          userId: userId.toString(),
          boostType: type,
          durationMinutes: selectedPrice.duration_minutes.toString(),
        },
      });

      return res.json({ success: true, checkoutUrl: session.url });
    }

    return res.status(400).json({ error: 'Invalid payment method' });
  } catch (error: any) {
    console.error('[BOOST_PURCHASE_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/boosts/active
 */
router.get('/active', async (req, res) => {
  const userId = BigInt((req as any).user.id);
  try {
    const activeBoost = await prisma.boosts.findFirst({
      where: { user_id: userId, status: 'active', expires_at: { gt: new Date() } },
      orderBy: { expires_at: 'desc' },
    });
    res.json(activeBoost || { active: false, boost: null });
  } catch (error) {
    res.json({ active: false, boost: null });
  }
});

/**
 * GET /api/boosts/history
 */
router.get('/history', async (req, res) => {
  const userId = BigInt((req as any).user.id);
  try {
    const history = await prisma.boosts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boost history' });
  }
});

export default router;
