import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { createNotification } from './notifications.js';
import { checkAndUnlockAchievements } from '../lib/achievements.js';
import { expressInterest, withdrawInterest, listMyInterestIds, INTEREST_STATUS } from '../lib/interests.js';

// Pillar 5 (VISION, 2026-11-16): fwber has NO friend requests. Interest is
// unilateral and private; connections unlock only on mutual interest.
// The request/accept/reject endpoints below survive only as 410 tombs so
// old clients fail loudly instead of recreating a rejection state.
function friendRequestsGone(res: any) {
  return res.status(410).json({
    success: false,
    code: 'FRIEND_REQUESTS_REMOVED',
    message: 'fwber has no friend requests. Use POST /api/friends/interest instead.',
  });
}

const router = Router();

// Helper: serialize BigInt values
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    // Detect Prisma Decimal by {s, e, d} signature
    if (obj.s !== undefined && obj.e !== undefined && Array.isArray(obj.d)) {
      try {
        const parts: string[] = [];
        for (let i = 0; i < obj.d.length; i++) {
          const d = String(obj.d[i]);
          parts.push(i === 0 ? d : d.padStart(7, '0'));
        }
        const digitStr = parts.join('');
        const intDigits = obj.e + 1;
        const sign = obj.s === -1 ? '-' : '';
        if (digitStr.length <= intDigits) {
          return parseFloat(sign + digitStr + '0'.repeat(intDigits - digitStr.length));
        }
        return parseFloat(sign + digitStr.slice(0, intDigits) + '.' + digitStr.slice(intDigits));
      } catch { return 0; }
    }
    if (obj instanceof Date) return obj.toISOString();
    const out: any = {};
    for (const key of Object.keys(obj)) out[key] = serialize(obj[key]);
    return out;
  }
  return obj;
}

// GET /api/friends — list accepted friends
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    const friendships = await prisma.friends.findMany({
      where: {
        OR: [{ user_id: userId }, { friend_id: userId }],
        status: 'accepted',
      },
      include: {
        users_friends_user_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
          },
        },
        users_friends_friend_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const friends = friendships.map((f: any) => {
      const isRequester = f.user_id.toString() === userId.toString();
      const otherUser = isRequester
        ? f.users_friends_friend_idTousers
        : f.users_friends_user_idTousers;
      const profile = Array.isArray(otherUser?.user_profiles)
        ? otherUser.user_profiles[0]
        : otherUser?.user_profiles;

      return {
        id: Number(otherUser?.id || 0),
        name: otherUser?.name || 'Unknown',
        display_name: profile?.display_name || otherUser?.name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        friends_since: f.created_at,
      };
    });

    res.json({ data: serialize(friends) });
  } catch (error: any) {
    console.error('[Friends] List error:', error.message);
    res.json({ data: [] });
  }
});

// NOTE (merge reconciliation 2026-11-11): the lane's v2.3.55 /search handler
// (wrapped {data} response, no exclusions) was removed here — it duplicated
// the handler below, and Express would have run only this first one. The
// handler below (bare array, excludes blocked/friends/pending) is canonical.

// GET /api/friends/requests — Pillar 5: there is no pending state, ever.
// Always empty so legacy clients render "no requests" instead of erroring.
router.get('/requests', authenticate, async (_req: any, res) => {
  res.json({ data: [] });
});

// POST /api/friends/interest — express unilateral, private interest.
// The target is told NOTHING unless the interest becomes mutual.
router.post('/interest', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { friend_id, user_id } = req.body || {};
    if (!friend_id && !user_id) {
      return res.status(400).json({ message: 'friend_id or user_id is required' });
    }
    const result = await expressInterest(userId, BigInt(friend_id || user_id));
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    if (result.mutual) checkAndUnlockAchievements(userId).catch(() => {});
    return res.json({
      success: true,
      mutual: result.mutual,
      connected: result.mutual,
      message: result.mutual ? 'You are now connected' : 'Interest saved privately',
    });
  } catch (error: any) {
    console.error('[Friends] Interest error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to save interest' });
  }
});

// DELETE /api/friends/interest/:friendId — withdraw interest silently.
router.delete('/interest/:friendId', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    await withdrawInterest(userId, BigInt(req.params.friendId));
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Friends] Withdraw error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to withdraw interest' });
  }
});

// GET /api/friends/interests — MY outgoing interests (private to me).
router.get('/interests', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const ids = await listMyInterestIds(userId);
    if (ids.length === 0) return res.json({ data: [] });
    const users = await prisma.users.findMany({
      where: { id: { in: ids } },
      include: {
        user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
      },
    });
    const data = (users as any[]).map((u) => {
      const profile = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
      return {
        id: Number(u.id),
        name: u.name,
        display_name: profile?.display_name || u.name,
        avatar_url: profile?.avatar_url || null,
      };
    });
    return res.json({ data: serialize(data) });
  } catch (error: any) {
    console.error('[Friends] Interests error:', error.message);
    return res.json({ data: [] });
  }
});

// GET /api/friends/search — search users to add as friends.
// NOTE: this route did not exist before; the Friends page called it and
// Express answered 404, so the page always showed "No users found".
// Returns a bare array (same convention as GET /api/user/search, which is
// what the Friends page expects). Excludes the caller, users blocked in
// either direction, existing friends, and pending requests in either
// direction, so every result is someone a request can actually be sent to.
router.get('/search', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.json([]);
    const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 50);

    // Users blocked in either direction
    const blocks = await prisma.blocks.findMany({
      where: { OR: [{ blocker_id: userId }, { blocked_id: userId }] },
      select: { blocker_id: true, blocked_id: true },
    });
    const excluded = new Set<string>();
    for (const b of blocks) {
      excluded.add(b.blocker_id.toString());
      excluded.add(b.blocked_id.toString());
    }

    // Existing connections + MY outgoing interests. Incoming interests
    // (people interested in me) are deliberately NOT excluded or marked:
    // interest is private, so an admirer appears in search like anyone
    // else — no signal leaks in either direction (Pillar 5).
    const [friendships, myInterests] = await Promise.all([
      prisma.friends.findMany({
        where: { OR: [{ user_id: userId }, { friend_id: userId }] },
        select: { user_id: true, friend_id: true },
      }),
      prisma.friend_requests.findMany({
        where: { user_id: userId, status: INTEREST_STATUS },
        select: { user_id: true, friend_id: true },
      }),
    ]);
    for (const f of [...friendships, ...myInterests]) {
      excluded.add(f.user_id.toString());
      excluded.add(f.friend_id.toString());
    }
    excluded.delete(userId.toString());

    const users = await prisma.users.findMany({
      where: {
        id: {
          not: userId,
          notIn: [...excluded].map((s) => BigInt(s)),
        },
        OR: [
          { name: { contains: q } },
          { user_profiles: { some: { display_name: { contains: q } } } },
          { user_profiles: { some: { bio: { contains: q } } } },
          { user_profiles: { some: { occupation: { contains: q } } } },
        ],
      },
      include: {
        user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    res.json(serialize(users.map((u: any) => {
      const profile = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
      return {
        id: Number(u.id),
        name: u.name,
        display_name: profile?.display_name || u.name,
        avatar_url: profile?.avatar_url || null,
      };
    })));
  } catch (error: any) {
    console.error('[Friends] Search error:', error.message);
    res.json([]);
  }
});

// POST /api/friends/request — REMOVED (Pillar 5). Tomb: fail loudly.
router.post('/request', authenticate, async (_req: any, res) => friendRequestsGone(res));

// POST /api/friends/requests — REMOVED (Pillar 5). Tomb: fail loudly.
router.post('/requests', authenticate, async (_req: any, res) => friendRequestsGone(res));

// POST /api/friends/requests/:id — REMOVED (Pillar 5). Tomb: fail loudly.
router.post('/requests/:id', authenticate, async (_req: any, res) => friendRequestsGone(res));

// POST /api/friends/accept/:id — REMOVED (Pillar 5). Tomb: fail loudly.
router.post('/accept/:id', authenticate, async (_req: any, res) => friendRequestsGone(res));

// POST /api/friends/reject/:id — REMOVED (Pillar 5). Tomb: fail loudly.
router.post('/reject/:id', authenticate, async (_req: any, res) => friendRequestsGone(res));

// DELETE /api/friends/:id — remove a friend
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const friendId = BigInt(req.params.id);

    // Remove bidirectional friendship
    const deleted = await prisma.friends.deleteMany({
      where: {
        OR: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (error: any) {
    console.error('[Friends] Delete error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove friend' });
  }
});

export default router;
