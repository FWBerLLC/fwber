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

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      if (userId) {
        // Here you would add tokens to the user's wallet
        // or update their premium status in the database
        console.log(`[Stripe] Payment completed for user ${userId}`);
        
        // Example: Add 100 tokens (this should be dynamic based on priceId)
        await prisma.users.update({
          where: { id: BigInt(userId) },
          data: {
            token_balance: { increment: 100 }
          }
        });
      }
      break;
    default:
      console.log(`[Stripe] Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
