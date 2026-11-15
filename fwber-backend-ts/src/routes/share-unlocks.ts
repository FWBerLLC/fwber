import { Router, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Viral Share-to-Unlock Router (`/api/share-unlocks` & `/api/share-unlock`)
 *
 * Why this implementation uses `prisma.content_unlocks`:
 * Production MySQL (`fwber_production`) contains `content_unlocks`
 * (`user_id`, `content_type`, `content_id`, `cost`, `created_at`), whereas a
 * separate `share_unlocks` table was never created in the schema. Previously,
 * raw SQL queries against `share_unlocks` threw `ER_NO_SUCH_TABLE` and silently
 * returned empty arrays, while singular `/api/share-unlock` calls from
 * `ProfileViewModal` and `ShareToUnlock` fell into the catch-all stub.
 *
 * Storing viral shares in `content_unlocks` with `content_type = "share:<platform>"`
 * and `cost = 0` persists real share streaks and profile unlocks with zero schema drift.
 */
const router = Router();
router.use(authenticate);

function normalizePlatform(raw: unknown): 'whatsapp' | 'twitter' | 'facebook' | 'copy' {
  const val = String(raw || 'copy').toLowerCase().trim();
  if (val.includes('whatsapp')) return 'whatsapp';
  if (val.includes('twitter') || val === 'x') return 'twitter';
  if (val.includes('facebook')) return 'facebook';
  return 'copy';
}

// GET /api/share-unlocks — List current user's viral share unlocks
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const rows = await prisma.content_unlocks.findMany({
      where: {
        user_id: userId,
        content_type: { startsWith: 'share:' },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Resolve target profile names/avatars for numeric target profile IDs
    const numericIds = Array.from(
      new Set(
        rows
          .map((r) => r.content_id)
          .filter((cid) => /^\d+$/.test(cid) && Number(cid) > 0)
          .map((cid) => BigInt(cid))
      )
    );

    const profileMap = new Map<number, { id: number; display_name: string; avatar_url?: string }>();
    if (numericIds.length > 0) {
      const targetUsers = await prisma.users.findMany({
        where: { id: { in: numericIds } },
        select: {
          id: true,
          name: true,
          user_profiles: { select: { display_name: true, avatar_url: true } },
        },
      });
      for (const u of targetUsers) {
        const up = Array.isArray(u.user_profiles) ? u.user_profiles[0] : (u.user_profiles as any);
        const uid = Number(u.id);
        const entry: { id: number; display_name: string; avatar_url?: string } = {
          id: uid,
          display_name: up?.display_name || u.name || `User #${uid}`,
        };
        if (up?.avatar_url) {
          entry.avatar_url = up.avatar_url;
        }
        profileMap.set(uid, entry);
      }
    }

    const data = rows.map((r) => {
      const rawPlatform = r.content_type.slice('share:'.length);
      const platform = normalizePlatform(rawPlatform);
      const numericTarget = /^\d+$/.test(r.content_id) ? Number(r.content_id) : 0;
      const createdAtIso =
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString());

      return {
        id: Number(r.id),
        user_id: Number(r.user_id),
        target_profile_id: numericTarget,
        content_type: 'profile',
        content_id: numericTarget,
        unlock_type: platform,
        platform,
        share_count: 1,
        unlocked_at: createdAtIso,
        created_at: createdAtIso,
        target_profile: numericTarget > 0 ? profileMap.get(numericTarget) : undefined,
      };
    });

    return res.json({ data, unlocks: data, total: data.length });
  } catch (err: any) {
    console.error('[share-unlocks] GET list error:', err?.message || err);
    return res.json({ data: [], unlocks: [], total: 0 });
  }
});

// GET /api/share-unlock/:targetId — Check whether current user unlocked a target profile/item
router.get('/:targetId', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const targetId = String(req.params.targetId || '').trim();
    if (!targetId) {
      return res.json({ unlocked: false });
    }

    const match = await prisma.content_unlocks.findFirst({
      where: {
        user_id: userId,
        content_id: targetId,
      },
      select: { id: true },
    });

    return res.json({ unlocked: Boolean(match) });
  } catch (err: any) {
    console.error('[share-unlocks] GET target check error:', err?.message || err);
    return res.json({ unlocked: false });
  }
});

// POST /api/share-unlock(s) — Record a viral share unlock
router.post('/', async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const platform = normalizePlatform(req.body?.platform || req.body?.unlock_type || 'copy');
    const rawTarget = req.body?.target_profile_id ?? req.body?.content_id ?? `invite-${Date.now()}`;
    const contentId = String(rawTarget).trim() || `invite-${Date.now()}`;
    const contentType = `share:${platform}`;
    const now = new Date();

    const record = await prisma.content_unlocks.upsert({
      where: {
        user_id_content_type_content_id: {
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
        },
      },
      update: { updated_at: now },
      create: {
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        cost: 0,
        created_at: now,
        updated_at: now,
      },
    });

    return res.json({
      success: true,
      unlocked: true,
      unlock: {
        id: Number(record.id),
        user_id: Number(record.user_id),
        target_profile_id: /^\d+$/.test(contentId) ? Number(contentId) : 0,
        platform,
        created_at: now.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[share-unlocks] POST error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to record share unlock' });
  }
});

export default router;
