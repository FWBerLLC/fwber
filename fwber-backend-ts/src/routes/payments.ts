import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27' as any,
}) : null;

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe checkout session for purchasing tokens or premium
 */
router.post('/create-checkout-session', authenticate, async (req: any, res) => {
  if (!stripe) {
    return res.status(500).json({ message: 'Stripe is not configured' });
  }

  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    const userId = BigInt(req.user.id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Session Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', async (req: any, res) => {
  if (!stripe) return res.sendStatus(500);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Stripe signature verification must run over the exact raw bytes;
    // index.ts stashes them on req._rawBody before express.json() parses.
    event = stripe.webhooks.constructEvent(
      (req as any)._rawBody ?? req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event. Dispatch on the checkout metadata each creation
  // route stamps: premium and boost purchases must grant what was bought;
  // only generic token checkouts fall through to the token credit.
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;
      const uid = BigInt(userId);
      console.log(`[Stripe] Payment completed for user ${userId}`);

      if (session.metadata?.type === 'premium_upgrade') {
        // Mirror the token-purchase grant in routes/premium.ts exactly.
        const days = session.metadata.planId === 'yearly' ? 365 : 30;
        await prisma.users.update({
          where: { id: uid },
          data: {
            tier: 'gold' as any,
            unlimited_swipes: true,
            tier_expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          },
        });
      } else if (session.metadata?.boostType) {
        // Mirror the token-purchase activation in routes/boosts.ts exactly.
        const durationMinutes = Number(session.metadata.durationMinutes || 30);
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
        await prisma.boosts.create({
          data: {
            user_id: uid,
            boost_type: session.metadata.boostType as any,
            status: 'active',
            started_at: new Date(),
            expires_at: expiresAt,
          },
        });
      } else {
        // Generic token checkout. NOTE: flat 100 regardless of amount —
        // flagged for Robert's product call (HANDOFF v2.3.100); unchanged.
        await prisma.users.update({
          where: { id: uid },
          data: {
            token_balance: { increment: 100 }
          }
        });
      }
      break;
    }
    default:
      console.log(`[Stripe] Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
