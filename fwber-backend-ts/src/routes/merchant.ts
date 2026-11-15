import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';
import { TokenDistributionService } from '../services/TokenDistributionService.js';
import { ActivityNotificationService } from '../services/ActivityNotificationService.js';

const router = Router();
const tokenService = new TokenDistributionService();

/**
 * GET /api/merchant/payment/:id
 * Publicly readable checkout invoice metadata so `/pay/[id]` can render merchant
 * name, description, and FWB total before prompting unauthenticated visitors to sign in.
 */
router.get('/payment/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const payment = await prisma.merchant_payments.findUnique({
      where: { id: String(req.params.id) },
      include: {
        users_merchant_payments_merchant_idTousers: {
          select: { id: true, name: true, merchant_name: true },
        },
      },
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const merchantUser = payment.users_merchant_payments_merchant_idTousers;
    return res.json({
      merchant_name: merchantUser?.merchant_name || merchantUser?.name || 'FWBer Merchant',
      payment: {
        id: payment.id,
        amount: Number(payment.amount).toFixed(2),
        description: payment.description || 'Token Checkout',
        status: payment.status,
        redirect_url: payment.redirect_url || null,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/merchant/payment/:id]', err.message);
    return res.status(500).json({ error: 'Failed to load payment session' });
  }
});

// Authenticated merchant & checkout routes below
router.use(authenticate);

/**
 * POST /api/merchant/keys
 * Issues or rotates a merchant API secret (`mch_<48 hex>`) for the Wallet Developer tab.
 */
router.post('/keys', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const secret = `mch_${crypto.randomBytes(24).toString('hex')}`;
    const merchantName = req.body?.merchant_name ? String(req.body.merchant_name).trim().slice(0, 120) : undefined;

    const updated = await prisma.users.update({
      where: { id: userId },
      data: {
        merchant_secret: secret,
        ...(merchantName ? { merchant_name: merchantName } : {}),
      },
      select: { merchant_secret: true, merchant_name: true },
    });

    return res.json({
      merchant_secret: updated.merchant_secret,
      merchant_name: updated.merchant_name,
    });
  } catch (err: any) {
    console.error('[POST /api/merchant/keys]', err.message);
    return res.status(500).json({ error: 'Failed to generate merchant keys' });
  }
});

/**
 * POST /api/merchant/payment
 * Creates a hosted `/pay/[id]` FWB token checkout invoice in `merchant_payments`.
 */
router.post('/payment', async (req: any, res: Response) => {
  try {
    const merchantId = BigInt(req.user.id);
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const created = await prisma.merchant_payments.create({
      data: {
        id,
        merchant_id: merchantId,
        amount,
        status: 'pending',
        description: req.body?.description ? String(req.body.description).trim().slice(0, 240) : 'FWBer Checkout',
        redirect_url: req.body?.redirect_url ? String(req.body.redirect_url).trim().slice(0, 240) : null,
        webhook_url: req.body?.webhook_url ? String(req.body.webhook_url).trim().slice(0, 240) : null,
        created_at: now,
        updated_at: now,
      },
    });

    return res.status(201).json({
      id: created.id,
      checkout_url: `/pay/${created.id}`,
      status: created.status,
      amount: Number(created.amount).toFixed(2),
    });
  } catch (err: any) {
    console.error('[POST /api/merchant/payment]', err.message);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
});

/**
 * POST /api/merchant/payment/:id/confirm
 * Atomically settles a `pending` `merchant_payments` invoice from the authenticated payer.
 */
router.post('/payment/:id/confirm', async (req: any, res: Response) => {
  try {
    const payerId = BigInt(req.user.id);
    const paymentId = String(req.params.id);

    const invoice = await prisma.merchant_payments.findUnique({
      where: { id: paymentId },
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (invoice.status === 'paid') {
      return res.json({ success: true, status: 'paid', redirect_url: invoice.redirect_url || undefined });
    }
    if (invoice.status !== 'pending') {
      return res.status(400).json({ error: `Payment is ${invoice.status}` });
    }

    const amount = Number(invoice.amount);
    const payer = await prisma.users.findUnique({
      where: { id: payerId },
      select: { token_balance: true },
    });
    if (Number(payer?.token_balance || 0) < amount) {
      return res.status(402).json({ error: 'Insufficient FWB balance' });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: payerId },
        data: { token_balance: { decrement: amount } },
      });
      await tx.users.update({
        where: { id: invoice.merchant_id },
        data: { token_balance: { increment: amount } },
      });
      await tx.merchant_payments.update({
        where: { id: paymentId },
        data: {
          payer_id: payerId,
          status: 'paid',
          paid_at: now,
          updated_at: now,
        },
      });
      await tx.wallet_transactions.create({
        data: {
          user_id: payerId,
          type: 'merchant_checkout',
          amount: -amount,
          description: invoice.description || `Merchant payment ${paymentId.slice(0, 8)}`,
          created_at: now,
        },
      });
      await tx.wallet_transactions.create({
        data: {
          user_id: invoice.merchant_id,
          type: 'merchant_settlement',
          amount,
          description: `Checkout settled: ${invoice.description || paymentId.slice(0, 8)}`,
          created_at: now,
        },
      });
    });

    return res.json({
      success: true,
      status: 'paid',
      redirect_url: invoice.redirect_url || undefined,
    });
  } catch (err: any) {
    console.error('[POST /api/merchant/payment/:id/confirm]', err.message);
    return res.status(500).json({ error: 'Payment settlement failed' });
  }
});

/**
 * POST /api/merchant/pulse/:id/deactivate
 * Ends an active proximity pulse promotion created by a merchant.
 */
router.post('/pulse/:id/deactivate', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const artifactId = BigInt(req.params.id);
    await prisma.proximity_artifacts.updateMany({
      where: { id: artifactId, user_id: userId },
      data: { expires_at: new Date() },
    });
    return res.json({ success: true, deactivated_id: Number(artifactId) });
  } catch (err: any) {
    console.error('[POST /api/merchant/pulse/:id/deactivate]', err.message);
    return res.status(500).json({ error: 'Failed to deactivate pulse' });
  }
});

// GET /api/merchant/pulse/vibe — get neighborhood vibe based on recent artifacts
router.get('/pulse/vibe', async (req: any, res) => {
  try {
    const lat = Number(req.query.lat) || 42.33;
    const lng = Number(req.query.lng) || -83.05;

    // Count recent artifacts by type in the area
    const recent = await prisma.proximity_artifacts.findMany({
      where: { moderation_status: 'clean', expires_at: { gt: new Date() } },
      take: 50,
      orderBy: { created_at: 'desc' as const }
    });

    const total = recent.length;
    if (total === 0) {
      return res.json({ vibe: 'quiet', score: 0.3, confidence: 0.1, message: 'Not much activity nearby right now', artifact_count: 0 });
    }

    // Determine vibe from artifact types
    const shouts = recent.filter((a: any) => a.type === 'shout').length;
    const questions = recent.filter((a: any) => a.type === 'question').length;
    const events = recent.filter((a: any) => a.type === 'event').length;
    const recs = recent.filter((a: any) => a.type === 'recommendation').length;

    let heuristicVibe = 'neutral';
    let score = 0.5;
    if (events > 2) { heuristicVibe = 'hype'; score = 0.9; }
    else if (shouts > 3) { heuristicVibe = 'social'; score = 0.75; }
    else if (recs > 2) { heuristicVibe = 'chill'; score = 0.6; }
    else if (questions > 1) { heuristicVibe = 'curious'; score = 0.55; }

    // AI-driven neighborhood sentiment
    const aiAnalysis = await SentimentAnalysisService.analyzeNeighborhoodSentiment(lat, lng);

    res.json({
      business_name: 'Merchant', // Placeholder
      location: { lat, lng, radius: 5000 },
      analysis: {
        vibe: aiAnalysis.vibe !== 'Neutral' ? aiAnalysis.vibe : heuristicVibe,
        sentiment: aiAnalysis.sentiment || 0.5,
        trending_keywords: aiAnalysis.keywords || [],
        activity_score: total,
        summary: aiAnalysis.summary || `Heuristic detection: ${heuristicVibe}`,
        post_count: total,
        last_updated: new Date().toISOString()
      },
      heuristic_vibe: heuristicVibe,
      ai_raw: aiAnalysis
    });
  } catch (err: any) {
    res.json({ vibe: 'neutral', score: 0.5, confidence: 0, message: 'Vibe analysis not yet available' });
  }
});

// POST /api/merchant/pulse/broadcast — Broadcast a notification to nearby users based on vibe
router.post('/pulse/broadcast', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { content, vibe_target, discount_code, lat, lng } = req.body;
    const broadcastCost = 50;

    // 1. Check & Spend Tokens
    try {
      await tokenService.spendTokens(userId, broadcastCost, 'Vibe Pulse Broadcast');
    } catch (e: any) {
      return res.status(403).json({ error: e.message });
    }

    // 2. Vibe Check (if targeted)
    const currentLat = lat || 42.33;
    const currentLng = lng || -83.05;
    const aiAnalysis = await SentimentAnalysisService.analyzeNeighborhoodSentiment(currentLat, currentLng);

    if (vibe_target && vibe_target !== 'any' && aiAnalysis.vibe.toLowerCase() !== vibe_target.toLowerCase()) {
      return res.json({
        status: 'skipped',
        message: `Vibe mismatch. Target: ${vibe_target}, Current: ${aiAnalysis.vibe}`,
        current_vibe: aiAnalysis.vibe,
        token_cost: broadcastCost
      });
    }

    // 3. Identify nearby users (within ~1 mile / 1.6km)
    const nearbyUsers = await prisma.user_locations.findMany({
      where: {
        latitude: { gte: currentLat - 0.015, lte: currentLat + 0.015 },
        longitude: { gte: currentLng - 0.015, lte: currentLng + 0.015 },
        updated_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Active in last hour
      },
      select: { user_id: true }
    });

    // 4. Send Notifications
    const broadcastId = `broadcast_${Date.now()}`;
    const notificationPromises = nearbyUsers.map(u =>
      ActivityNotificationService.notify(
        u.user_id,
        'Local Flash Deal',
        content,
        { type: 'merchant_broadcast', discount_code, vibe: aiAnalysis.vibe, broadcast_id: broadcastId }
      )
    );
    await Promise.all(notificationPromises);

    res.json({
      status: 'success',
      recipient_count: nearbyUsers.length,
      current_vibe: aiAnalysis.vibe,
      token_cost: broadcastCost
    });
  } catch (err: any) {
    console.error('[Merchant] Broadcast error:', err.message);
    res.status(500).json({ error: 'Failed to transmit broadcast' });
  }
});

export default router;
