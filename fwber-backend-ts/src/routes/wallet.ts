import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET /api/wallet - Get user wallet balance
// GET /api/wallet/balance - Alias for balance
async function getWalletBalance(req: any, res: any) {
  const userId = BigInt(req.user.id);
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        token_balance: true,
        wallet_address: true,
        referral_code: true,
      }
    });

    let transactions: any[] = [];
    try {
      transactions = await prisma.wallet_transactions.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 5
      });
    } catch (_) {}

    // Referral count
    let referral_count = 0;
    try {
      const refs = await prisma.$queryRawUnsafe(
        'SELECT COUNT(*) AS cnt FROM referral_rewards WHERE referrer_id = ?',
        userId.toString()
      ) as any[];
      referral_count = Number(refs?.[0]?.cnt || 0);
    } catch (_) {}

    res.json({
      balance: user?.token_balance || 0,
      tokens: user?.token_balance || 0,
      currency: 'FWB',
      transactions,
      wallet_address: user?.wallet_address || null,
      referral_code: user?.referral_code || null,
      referral_count,
      golden_tickets_remaining: 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
}

router.get('/', authenticate, getWalletBalance);
router.get('/balance', authenticate, getWalletBalance);

// GET /api/wallet/transactions - Transaction history
router.get('/transactions', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  try {
    const transactions = await prisma.wallet_transactions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    res.json({ transactions, total: transactions.length });
  } catch (error) {
    // Fallback: if wallet_transactions not available, check merchant_payments
    try {
      const transactions = await prisma.merchant_payments.findMany({
        where: { payer_id: userId },
        orderBy: { created_at: 'desc' },
        take: 20
      });
      res.json({ transactions, total: transactions.length });
    } catch (e) {
      res.json({ transactions: [], total: 0 });
    }
  }
});

/**
 * POST /api/wallet/top-up/initiate
 * Creates a Stripe Payment Intent for a specific USD amount
 */
router.post('/top-up/initiate', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { amount_usd } = req.body;

  if (!stripe) {
    return res.status(501).json({ error: 'Stripe is not configured on the server' });
  }

  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_usd * 100, // Stripe expects amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId.toString(),
        type: 'wallet_topup',
        amount_usd: amount_usd.toString()
      }
    });

    res.json({
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('[WALLET_TOPUP_INITIATE_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/wallet/top-up/confirm
 * Synchronous confirmation (optional, webhooks are better but this allows immediate UI update)
 */
router.post('/top-up/confirm', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { payment_intent_id } = req.body;

  if (!stripe) {
    return res.status(501).json({ error: 'Stripe is not configured' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === 'succeeded' && paymentIntent.metadata.userId === userId.toString()) {
      const amountUsdStr = paymentIntent.metadata.amount_usd || '0';
      const amountUsd = parseInt(amountUsdStr);
      
      // Calculate token amount (matches AMOUNTS in frontend)
      let fwbAmount = amountUsd * 10;
      if (amountUsd >= 100) fwbAmount = 1200;
      else if (amountUsd >= 50) fwbAmount = 550;

      // Update user balance
      await prisma.users.update({
        where: { id: userId },
        data: {
          token_balance: { increment: fwbAmount }
        }
      });

      return res.json({ success: true, new_balance: fwbAmount });
    }

    res.status(400).json({ error: 'Payment not successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wallet/deposit — deposit FWB tokens (internal transfer)
router.post('/deposit', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { amount } = req.body;
  const depositAmount = Number(amount);
  if (!depositAmount || depositAmount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  try {
    await prisma.users.update({
      where: { id: userId },
      data: { token_balance: { increment: depositAmount } },
    });
    await prisma.wallet_transactions.create({
      data: {
        user_id: userId,
        type: 'deposit',
        amount: depositAmount,
        description: `Deposited ${depositAmount} FWB`,
        created_at: new Date(),
      },
    });
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { token_balance: true },
    });
    res.json({ success: true, balance: user?.token_balance || 0 });
  } catch (error: any) {
    console.error('[WALLET_DEPOSIT_ERROR]', error.message);
    res.status(500).json({ error: 'Failed to deposit' });
  }
});

// POST /api/wallet/withdraw — withdraw FWB tokens
router.post('/withdraw', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { amount, wallet_address } = req.body;
  const withdrawAmount = Number(amount);
  if (!withdrawAmount || withdrawAmount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { token_balance: true },
    });
    const currentBalance = Number(user?.token_balance || 0);
    if (withdrawAmount > currentBalance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await prisma.users.update({
      where: { id: userId },
      data: { token_balance: { decrement: withdrawAmount } },
    });
    await prisma.wallet_transactions.create({
      data: {
        user_id: userId,
        type: 'withdrawal',
        amount: -withdrawAmount,
        description: `Withdrew ${withdrawAmount} FWB${wallet_address ? ` to ${wallet_address.slice(0, 8)}...` : ''}`,
        created_at: new Date(),
      },
    });
    const updatedUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { token_balance: true },
    });
    res.json({ success: true, balance: updatedUser?.token_balance || 0 });
  } catch (error: any) {
    console.error('[WALLET_WITHDRAW_ERROR]', error.message);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

// POST /api/wallet/address — save external wallet address
router.post('/address', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { wallet_address } = req.body;
  if (!wallet_address) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  try {
    await prisma.users.update({
      where: { id: userId },
      data: { wallet_address },
    });
    res.json({ success: true, wallet_address });
  } catch (error: any) {
    console.error('[WALLET_ADDRESS_ERROR]', error.message);
    res.status(500).json({ error: 'Failed to update wallet address' });
  }
});

export default router;
