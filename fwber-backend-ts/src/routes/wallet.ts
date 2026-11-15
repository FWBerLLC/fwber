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

/**
 * POST /api/wallet/transfer
 * Peer-to-peer FWB token transfer & tipping (`SendTokenModal.tsx` & `TipButton.tsx`).
 * Supports recipient lookup by `recipient_id` or `recipient_email`, enforces
 * bidirectional `blocks`, and executes an atomic ledger + balance update.
 */
router.post('/transfer', authenticate, async (req: any, res) => {
  const senderId = BigInt(req.user.id);
  const { recipient_id, recipient_email, amount, message, on_chain, signature } = req.body || {};
  const transferAmount = Number(amount);

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'A positive transfer amount is required' });
  }

  try {
    const recipient = recipient_id
      ? await prisma.users.findUnique({
          where: { id: BigInt(recipient_id) },
          select: { id: true, name: true, email: true },
        })
      : recipient_email
      ? await prisma.users.findUnique({
          where: { email: String(recipient_email).trim() },
          select: { id: true, name: true, email: true },
        })
      : null;

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    if (recipient.id === senderId) {
      return res.status(400).json({ error: 'Cannot transfer tokens to yourself' });
    }

    const blockExists = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: senderId, blocked_id: recipient.id },
          { blocker_id: recipient.id, blocked_id: senderId },
        ],
      },
    });
    if (blockExists) {
      return res.status(403).json({ error: 'Transfers between these accounts are restricted' });
    }

    const sender = await prisma.users.findUnique({
      where: { id: senderId },
      select: { name: true, token_balance: true },
    });

    if (!on_chain) {
      const currentBalance = Number(sender?.token_balance || 0);
      if (currentBalance < transferAmount) {
        return res.status(402).json({ error: 'Insufficient FWB balance' });
      }
    }

    const now = new Date();
    const cleanNote = message ? String(message).trim().slice(0, 180) : '';
    const txSuffix = on_chain && signature ? ` (tx: ${String(signature).slice(0, 10)}...)` : '';

    const updatedSender = await prisma.$transaction(async (tx) => {
      if (!on_chain) {
        await tx.users.update({
          where: { id: senderId },
          data: { token_balance: { decrement: transferAmount } },
        });
        await tx.users.update({
          where: { id: recipient.id },
          data: { token_balance: { increment: transferAmount } },
        });
      }

      await tx.wallet_transactions.create({
        data: {
          user_id: senderId,
          type: 'transfer_out',
          amount: -transferAmount,
          description: `Sent ${transferAmount} FWB to ${recipient.name}${cleanNote ? `: "${cleanNote}"` : ''}${txSuffix}`,
          created_at: now,
        },
      });

      await tx.wallet_transactions.create({
        data: {
          user_id: recipient.id,
          type: 'transfer_in',
          amount: transferAmount,
          description: `Received ${transferAmount} FWB from ${sender?.name || 'a member'}${cleanNote ? `: "${cleanNote}"` : ''}${txSuffix}`,
          created_at: now,
        },
      });

      return tx.users.findUnique({
        where: { id: senderId },
        select: { token_balance: true },
      });
    });

    // Best-effort in-app notification to recipient
    prisma.notifications
      .create({
        data: {
          user_id: recipient.id,
          title: 'FWB Tokens Received',
          body: `${sender?.name || 'Someone'} sent you ${transferAmount} FWB${cleanNote ? ` — "${cleanNote}"` : ''}.`,
          created_at: now,
        },
      })
      .catch(() => {});

    return res.json({
      success: true,
      amount: transferAmount,
      recipient_id: Number(recipient.id),
      balance: Number(updatedSender?.token_balance || 0),
    });
  } catch (error: any) {
    console.error('[WALLET_TRANSFER_ERROR]', error.message);
    return res.status(500).json({ error: 'Failed to complete token transfer' });
  }
});

/**
 * GET /api/wallet/requests — Incoming ("To Pay") & Outgoing ("Sent") payment requests
 */
router.get('/requests', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  try {
    const [incomingRows, outgoingRows] = await Promise.all([
      prisma.payment_requests.findMany({
        where: { payer_id: userId },
        include: {
          users_payment_requests_requester_idTousers: {
            select: { id: true, name: true, email: true },
          },
          users_payment_requests_payer_idTousers: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.payment_requests.findMany({
        where: { requester_id: userId },
        include: {
          users_payment_requests_requester_idTousers: {
            select: { id: true, name: true, email: true },
          },
          users_payment_requests_payer_idTousers: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
    ]);

    const formatRow = (r: any) => ({
      id: Number(r.id),
      amount: Number(r.amount).toFixed(2),
      note: r.note || '',
      status: r.status,
      requester: r.users_payment_requests_requester_idTousers
        ? {
            id: Number(r.users_payment_requests_requester_idTousers.id),
            name: r.users_payment_requests_requester_idTousers.name,
            email: r.users_payment_requests_requester_idTousers.email,
          }
        : undefined,
      payer: r.users_payment_requests_payer_idTousers
        ? {
            id: Number(r.users_payment_requests_payer_idTousers.id),
            name: r.users_payment_requests_payer_idTousers.name,
            email: r.users_payment_requests_payer_idTousers.email,
          }
        : undefined,
      created_at: r.created_at?.toISOString() || new Date().toISOString(),
    });

    return res.json({
      incoming: incomingRows.map(formatRow),
      outgoing: outgoingRows.map(formatRow),
    });
  } catch (error: any) {
    console.error('[WALLET_REQUESTS_GET_ERROR]', error.message);
    return res.json({ incoming: [], outgoing: [] });
  }
});

/**
 * POST /api/wallet/requests — Create a payment request against a friend/member
 */
router.post('/requests', authenticate, async (req: any, res) => {
  const requesterId = BigInt(req.user.id);
  const { payer_id, amount, note } = req.body || {};
  const reqAmount = Number(amount);

  if (!payer_id || !Number.isFinite(reqAmount) || reqAmount <= 0) {
    return res.status(400).json({ error: 'Valid payer_id and positive amount are required' });
  }

  try {
    const payerId = BigInt(payer_id);
    if (payerId === requesterId) {
      return res.status(400).json({ error: 'Cannot request tokens from yourself' });
    }

    const blockExists = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: requesterId, blocked_id: payerId },
          { blocker_id: payerId, blocked_id: requesterId },
        ],
      },
    });
    if (blockExists) {
      return res.status(403).json({ error: 'Cannot send payment requests to this user' });
    }

    const payer = await prisma.users.findUnique({
      where: { id: payerId },
      select: { id: true, name: true },
    });
    if (!payer) {
      return res.status(404).json({ error: 'Payer not found' });
    }

    const now = new Date();
    const created = await prisma.payment_requests.create({
      data: {
        requester_id: requesterId,
        payer_id: payerId,
        amount: reqAmount,
        note: note ? String(note).trim().slice(0, 250) : null,
        status: 'pending',
        created_at: now,
        updated_at: now,
      },
    });

    prisma.notifications
      .create({
        data: {
          user_id: payerId,
          title: 'New Payment Request',
          body: `${req.user.name || 'A friend'} requested ${reqAmount} FWB${note ? ` ("${String(note).slice(0, 80)}")` : ''}.`,
          created_at: now,
        },
      })
      .catch(() => {});

    return res.status(201).json({
      success: true,
      id: Number(created.id),
      status: created.status,
      amount: Number(created.amount).toFixed(2),
    });
  } catch (error: any) {
    console.error('[WALLET_REQUESTS_CREATE_ERROR]', error.message);
    return res.status(500).json({ error: 'Failed to create payment request' });
  }
});

/**
 * POST /api/wallet/requests/:id/pay — Settle an incoming pending payment request
 */
router.post('/requests/:id/pay', authenticate, async (req: any, res) => {
  const payerId = BigInt(req.user.id);
  try {
    const requestId = BigInt(req.params.id);
    const paymentReq = await prisma.payment_requests.findUnique({
      where: { id: requestId },
    });

    if (!paymentReq) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    if (paymentReq.payer_id !== payerId) {
      return res.status(403).json({ error: 'Only the designated payer can settle this request' });
    }
    if (paymentReq.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${paymentReq.status}` });
    }

    const amount = Number(paymentReq.amount);
    const payer = await prisma.users.findUnique({
      where: { id: payerId },
      select: { token_balance: true, name: true },
    });
    if (Number(payer?.token_balance || 0) < amount) {
      return res.status(402).json({ error: 'Insufficient FWB balance to pay request' });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: payerId },
        data: { token_balance: { decrement: amount } },
      });
      await tx.users.update({
        where: { id: paymentReq.requester_id },
        data: { token_balance: { increment: amount } },
      });
      await tx.payment_requests.update({
        where: { id: requestId },
        data: { status: 'paid', paid_at: now, updated_at: now },
      });
      await tx.wallet_transactions.create({
        data: {
          user_id: payerId,
          type: 'request_paid',
          amount: -amount,
          description: `Paid request #${Number(requestId)}${paymentReq.note ? `: "${paymentReq.note}"` : ''}`,
          created_at: now,
        },
      });
      await tx.wallet_transactions.create({
        data: {
          user_id: paymentReq.requester_id,
          type: 'request_received',
          amount,
          description: `Payment request #${Number(requestId)} settled by ${payer?.name || 'member'}`,
          created_at: now,
        },
      });
    });

    return res.json({ success: true, status: 'paid' });
  } catch (error: any) {
    console.error('[WALLET_REQUESTS_PAY_ERROR]', error.message);
    return res.status(500).json({ error: 'Failed to pay request' });
  }
});

/**
 * POST /api/wallet/requests/:id/cancel — Cancel (requester) or Decline (payer) a pending request
 */
router.post('/requests/:id/cancel', authenticate, async (req: any, res) => {
  const actorId = BigInt(req.user.id);
  try {
    const requestId = BigInt(req.params.id);
    const paymentReq = await prisma.payment_requests.findUnique({
      where: { id: requestId },
    });

    if (!paymentReq) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    if (paymentReq.requester_id !== actorId && paymentReq.payer_id !== actorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (paymentReq.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${paymentReq.status}` });
    }

    const nextStatus = paymentReq.payer_id === actorId ? 'declined' : 'cancelled';
    await prisma.payment_requests.update({
      where: { id: requestId },
      data: { status: nextStatus, updated_at: new Date() },
    });

    return res.json({ success: true, status: nextStatus });
  } catch (error: any) {
    console.error('[WALLET_REQUESTS_CANCEL_ERROR]', error.message);
    return res.status(500).json({ error: 'Failed to cancel request' });
  }
});

export default router;
