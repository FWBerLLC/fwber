import { Router, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Token-Gated Content Unlocks Router (`/api/content-unlocks`)
 *
 * Powers `components/ContentUnlockGate.tsx` and paid unlock surfaces.
 *
 * Design notes:
 * - Uses the live `content_unlocks` MySQL table (`@@unique([user_id, content_type, content_id])`).
 * - Idempotent: if the user already unlocked `(content_type, content_id)`, returns `200`
 *   without charging tokens a second time.
 * - Atomic: checks `users.token_balance`, decrements tokens, creates the `content_unlocks`
 *   record, and appends a `wallet_transactions` audit row inside a single `$transaction`.
 * - Returns HTTP `402 Payment Required` when `token_balance < cost` so `ContentUnlockGate`
 *   displays its "Insufficient Tokens" prompt.
 */
const router = Router();
router.use(authenticate);

function serializeUnlock(row: any) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    content_type: row.content_type,
    content_id: Number.isNaN(Number(row.content_id)) ? row.content_id : Number(row.content_id),
    cost: Number(row.cost ?? 0),
    token_cost: Number(row.cost ?? 0),
    unlocked_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at || new Date().toISOString(),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at || new Date().toISOString(),
  };
}

// GET /api/content-unlocks — List paid content unlocks for current user
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const rows = await prisma.content_unlocks.findMany({
      where: {
        user_id: userId,
        NOT: { content_type: { startsWith: 'share:' } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    const data = rows.map(serializeUnlock);
    return res.json({ data, unlocks: data, total: data.length });
  } catch (err: any) {
    console.error('[content-unlocks] GET error:', err?.message || err);
    return res.json({ data: [], unlocks: [], total: 0 });
  }
});

// POST /api/content-unlocks — Purchase/record a content unlock
router.post('/', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const contentType = String(req.body?.content_type || 'premium_content').trim();
    const contentId = String(req.body?.content_id ?? '').trim();

    if (!contentId) {
      return res.status(400).json({ error: 'content_id is required' });
    }

    const rawCost = req.body?.cost !== undefined ? Number(req.body.cost) : 10;
    const tokenCost = Number.isFinite(rawCost) && rawCost >= 0 ? Math.ceil(rawCost) : 10;

    // Fast idempotency check
    const existing = await prisma.content_unlocks.findUnique({
      where: {
        user_id_content_type_content_id: {
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
        },
      },
    });

    if (existing) {
      return res.json({
        success: true,
        already_unlocked: true,
        unlock: serializeUnlock(existing),
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id: userId },
        select: { token_balance: true },
      });

      const balance = Number(user?.token_balance ?? 0);
      if (!user || balance < tokenCost) {
        return { insufficient: true as const, balance };
      }

      if (tokenCost > 0) {
        await tx.users.update({
          where: { id: userId },
          data: { token_balance: { decrement: tokenCost } },
        });
      }

      const now = new Date();
      const created = await tx.content_unlocks.create({
        data: {
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
          cost: tokenCost,
          created_at: now,
          updated_at: now,
        },
      });

      if (tokenCost > 0) {
        await tx.wallet_transactions.create({
          data: {
            user_id: userId,
            amount: -tokenCost,
            type: 'content_unlock',
            description: `Unlocked ${contentType} #${contentId}`,
            created_at: now,
            updated_at: now,
          },
        });
      }

      return { insufficient: false as const, unlock: created };
    });

    if (result.insufficient) {
      return res.status(402).json({
        error: `Insufficient tokens (${result.balance} available, ${tokenCost} required)`,
      });
    }

    return res.status(201).json({
      success: true,
      unlock: serializeUnlock(result.unlock),
    });
  } catch (err: any) {
    console.error('[content-unlocks] POST error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to unlock content' });
  }
});

export default router;
