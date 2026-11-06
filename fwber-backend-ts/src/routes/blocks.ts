import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /api/blocks — list blocked users
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const blocks = await prisma.blocks.findMany({
      where: { blocker_id: userId },
      include: {
        users_blocks_blocked_idTousers: {
          select: { id: true, name: true, user_profiles: { select: { avatar_url: true, display_name: true } } }
        }
      },
      orderBy: { created_at: 'desc' as const }
    });
    res.json({
      data: blocks.map((b: any) => {
        const profile = Array.isArray(b.users_blocks_blocked_idTousers?.user_profiles)
          ? b.users_blocks_blocked_idTousers.user_profiles[0]
          : b.users_blocks_blocked_idTousers?.user_profiles;
        return {
          id: Number(b.id),
          blocked_id: Number(b.blocked_id),
          name: profile?.display_name || b.users_blocks_blocked_idTousers?.name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          created_at: b.created_at?.toISOString(),
        };
      }),
      total: blocks.length
    });
  } catch (err: any) {
    console.error('[blocks] GET error:', err.message);
    res.json({ data: [], total: 0 });
  }
});

// POST /api/blocks — block a user
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const rawId = req.body.user_id || req.body.blocked_id || req.body.blocked_user_id;
    if (!rawId) return res.status(400).json({ error: 'user_id or blocked_id is required' });

    let blockedId: bigint;
    try { blockedId = BigInt(rawId); } catch { return res.status(400).json({ error: 'Invalid user_id' }); }
    if (blockedId === userId) return res.status(400).json({ error: 'Cannot block yourself' });

    // Check if already blocked
    const existing = await prisma.blocks.findFirst({
      where: { blocker_id: userId, blocked_id: blockedId }
    });
    if (existing) return res.json({ message: 'Already blocked', blocked: true });

    await prisma.blocks.create({
      data: { blocker_id: userId, blocked_id: blockedId }
    });

    // Blocking severs the connection completely: remove any friendship and
    // any pending friend requests between these users, so the blocked user
    // disappears from the blocker's friends list and no request can linger.
    // (Matches were already removed below; keep each cleanup independent so
    // one failing table cannot leave the block half-applied.)
    try {
      await prisma.friends.deleteMany({
        where: {
          OR: [
            { user_id: userId, friend_id: blockedId },
            { user_id: blockedId, friend_id: userId },
          ],
        },
      });
    } catch (_) {}
    try {
      await prisma.friend_requests.deleteMany({
        where: {
          OR: [
            { user_id: userId, friend_id: blockedId },
            { user_id: blockedId, friend_id: userId },
          ],
          status: 'pending',
        },
      });
    } catch (_) {}

    // Remove any active match between these users
    try {
      await prisma.user_matches.deleteMany({
        where: {
          OR: [
            { user1_id: userId, user2_id: blockedId },
            { user1_id: blockedId, user2_id: userId }
          ]
        }
      });
    } catch (_) {}

    res.json({ message: 'User blocked', blocked: true });
  } catch (err: any) {
    console.error('[blocks] POST error:', err.message);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/blocks/:userId — unblock a user
router.delete('/:userId', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const blockedId = BigInt(req.params.userId);

    const result = await prisma.blocks.deleteMany({
      where: { blocker_id: userId, blocked_id: blockedId }
    });

    res.json({
      message: result.count > 0 ? 'User unblocked' : 'Not blocked',
      unblocked: result.count > 0
    });
  } catch (err: any) {
    console.error('[blocks] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

export default router;
