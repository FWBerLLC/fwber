import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

/**
 * Promotion Interaction Telemetry Router (`/api/promotions`)
 *
 * Powers `DealCard` analytics in `app/deals/page.tsx` (`POST /api/promotions/:id/track`)
 * and feeds live view/click/redemption counters in `/api/merchant-portal/analytics`
 * and `/api/merchant-portal/promotions`.
 */
const router = Router();

const VALID_EVENT_TYPES = new Set(['view', 'click', 'redemption']);

function tryExtractViewerId(req: Request): bigint | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as { id?: string | number };
    if (decoded?.id !== undefined && decoded?.id !== null) {
      return BigInt(decoded.id);
    }
  } catch {
    // Ignore expired/invalid tokens on telemetry beacons
  }
  return null;
}

// POST /api/promotions/:id/track — Record deal/promotion view, click, or redemption
router.post('/:id/track', async (req: Request, res: Response) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!/^\d+$/.test(rawId)) {
      return res.status(400).json({ error: 'Invalid promotion ID' });
    }

    const rawType = String(req.body?.type || 'view').toLowerCase().trim();
    if (!VALID_EVENT_TYPES.has(rawType)) {
      return res.status(400).json({ error: 'Invalid event type. Expected view, click, or redemption.' });
    }

    const viewerId = tryExtractViewerId(req);
    const now = new Date();

    const event = await prisma.promotion_events.create({
      data: {
        promotion_id: BigInt(rawId),
        user_id: viewerId,
        type: rawType as 'view' | 'click' | 'redemption',
        metadata: req.body?.metadata ?? {},
        created_at: now,
        updated_at: now,
      },
    });

    return res.status(201).json({
      success: true,
      event_id: Number(event.id),
      promotion_id: Number(event.promotion_id),
      type: event.type,
    });
  } catch (err: any) {
    console.error('[promotions] Track error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to record promotion event' });
  }
});

export default router;
