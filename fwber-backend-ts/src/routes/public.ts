import { Router, type Request, type Response } from 'express';
import * as ai from '../lib/wingman-ai.js';
import prisma from '../lib/prisma.js';
import { createRateLimiter } from '../lib/rateLimit.js';

const router = Router();
const publicVouchLimiter = createRateLimiter({ name: 'public-vouch', windowMs: 60_000, max: 15 });

// GET /api/public/roast — Return a default roast (no auth, for landing pages)
router.get('/roast', (_req, res) => {
  res.json({
    roast: 'Your profile gives off "I still use Internet Explorer" energy. But hey, at least you showed up! Create a profile for a personalized roast.',
    is_preview: true,
    cta: 'Create a profile at fwber.online for a personalized roast',
  });
});

// POST /api/public/roast — Guest roast/hype (no auth required)
router.post('/roast', async (req, res) => {
  try {
    const { name = 'Anonymous', job = 'mysterious stranger', trait = 'enigmatic', mode = 'roast' } = req.body || {};

    const roast = await ai.generatePublicRoast(
      String(name), String(job), String(trait),
      mode === 'hype' ? 'hype' : 'roast'
    );

    // Use fallback if AI returned empty (providers down)
    const fallbackRoast = mode === 'hype'
      ? `Hey ${name}, you're absolutely killing it as a ${job}! Your "${trait}" vibe is unmatched! Keep shining, you absolute legend! 🔥✨`
      : `Hey ${name}, as a ${job} who's "${trait}", your profile gives off "I read the terms and conditions" energy. But honestly? That's iconic. Own it! 😏`;
    const finalRoast = roast || fallbackRoast;

    const type = mode === 'hype' ? 'hype' : 'roast';
    const shareId = `${type.slice(0, 4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      await prisma.viral_contents.create({
        data: { id: shareId, user_id: 0, type, content: JSON.stringify({ text: finalRoast, user_name: name }) },
      });
    } catch {}

    res.json({ roast: finalRoast, is_preview: !roast, cta: 'Create your own profile at fwber.online', share_id: shareId });
  } catch (err: any) {
    console.error('[public/roast]', err.message);
    const name = (req.body || {}).name || 'you';
    res.json({
      roast: `Hey ${name}, your profile gives off "I still use Internet Explorer" energy. But hey, at least you showed up!`,
      is_preview: true,
      cta: 'Create a profile for a personalized roast',
    });
  }
});

// POST /api/public/vouch — Public external vouch submission (/vouch/[code])
router.post('/vouch', publicVouchLimiter, async (req: Request, res: Response) => {
  try {
    const { referral_code, type, relationship_type, comment, voucher_name } = req.body || {};

    const cleanCode = String(referral_code || '').trim();
    if (!cleanCode) {
      return res.status(400).json({ error: 'referral_code is required' });
    }

    const allowedTypes = new Set(['safe', 'fun', 'hot']);
    const normalizedType = String(type || 'safe').trim().toLowerCase();
    if (!allowedTypes.has(normalizedType)) {
      return res.status(400).json({ error: 'type must be safe, fun, or hot' });
    }

    const targetUser = await prisma.users.findFirst({
      where: { referral_code: cleanCode },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'Invalid or expired referral code' });
    }

    const now = new Date();
    const safeName = voucher_name ? String(voucher_name).trim().slice(0, 120) : 'Anonymous Friend';
    const safeRelation = relationship_type ? String(relationship_type).trim().slice(0, 80) : null;
    const safeComment = comment ? String(comment).trim().slice(0, 1000) : null;

    const vouch = await prisma.vouches.create({
      data: {
        to_user_id: targetUser.id,
        from_user_id: null,
        voucher_name: safeName,
        type: normalizedType,
        relationship_type: safeRelation,
        comment: safeComment,
        is_verified: false,
        ip_address: req.ip || null,
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.notifications.create({
      data: {
        user_id: targetUser.id,
        type: 'vouch_received',
        title: 'New Reputation Vouch!',
        body: `${safeName} vouched for you as "${normalizedType}".`,
        data: JSON.stringify({ vouch_id: Number(vouch.id), type: normalizedType }),
        created_at: now,
        updated_at: now,
      },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      vouch_id: Number(vouch.id),
      type: normalizedType,
    });
  } catch (err: any) {
    console.error('[POST /public/vouch]', err.message);
    res.status(500).json({ error: 'Failed to record vouch' });
  }
});

export default router;
