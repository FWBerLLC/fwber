import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { createNotification } from './notifications.js';
import { checkAndUnlockAchievements } from '../lib/achievements.js';

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

// GET /api/friends/requests — list pending friend requests
router.get('/requests', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    // Incoming requests (people who want to be friends with me)
    const incoming = await prisma.friend_requests.findMany({
      where: { friend_id: userId, status: 'pending' },
      include: {
        users_friend_requests_user_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Outgoing requests (people I want to be friends with)
    const outgoing = await prisma.friend_requests.findMany({
      where: { user_id: userId, status: 'pending' },
      include: {
        users_friend_requests_friend_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const serializeRequest = (req: any, type: 'incoming' | 'outgoing') => {
      const user = type === 'incoming'
        ? req.users_friend_requests_user_idTousers
        : req.users_friend_requests_friend_idTousers;
      const profile = Array.isArray(user?.user_profiles)
        ? user.user_profiles[0]
        : user?.user_profiles;

      return {
        id: Number(req.id),
        type,
        user: {
          id: Number(user?.id || 0),
          name: user?.name || 'Unknown',
          display_name: profile?.display_name || user?.name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
        },
        created_at: req.created_at,
      };
    };

    res.json({
      data: serialize([
        ...incoming.map((r: any) => serializeRequest(r, 'incoming')),
        ...outgoing.map((r: any) => serializeRequest(r, 'outgoing')),
      ]),
    });
  } catch (error: any) {
    console.error('[Friends] Requests error:', error.message);
    res.json({ data: [] });
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

    // Existing friends + pending requests (either direction)
    const [friendships, pending] = await Promise.all([
      prisma.friends.findMany({
        where: { OR: [{ user_id: userId }, { friend_id: userId }] },
        select: { user_id: true, friend_id: true },
      }),
      prisma.friend_requests.findMany({
        where: {
          OR: [{ user_id: userId }, { friend_id: userId }],
          status: 'pending',
        },
        select: { user_id: true, friend_id: true },
      }),
    ]);
    for (const f of [...friendships, ...pending]) {
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

// POST /api/friends/request — send a friend request
router.post('/request', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { friend_id, user_id } = req.body || {};

    if (!friend_id && !user_id) {
      return res.status(400).json({ message: 'friend_id or user_id is required' });
    }

    const friendId = BigInt(friend_id || user_id);

    if (userId === friendId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check target user exists
    const targetUser = await prisma.users.findUnique({ where: { id: friendId } });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // A block in either direction forbids new friend requests
    const blocked = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: userId, blocked_id: friendId },
          { blocker_id: friendId, blocked_id: userId },
        ],
      },
    });
    if (blocked) {
      return res.status(400).json({ message: 'Cannot send a friend request to this user' });
    }

    // Check if already friends or request exists
    const existingFriend = await prisma.friends.findFirst({
      where: {
        OR: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });
    if (existingFriend) {
      return res.status(400).json({ message: 'Already friends or friendship pending' });
    }

    const existingRequest = await prisma.friend_requests.findFirst({
      where: {
        OR: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
        status: 'pending',
      },
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already pending' });
    }

    await prisma.friend_requests.create({
      data: {
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
      },
    });

    // Notify the recipient
    await createNotification(friendId, 'New Friend Request',
      `${(await prisma.users.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'Someone'} wants to be your friend!`);

    res.json({ success: true, message: 'Friend request sent' });
  } catch (error: any) {
    console.error('[Friends] Request error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send friend request' });
  }
});

// POST /api/friends/requests — alias for frontend compatibility (send request via POST /friends/requests)
router.post('/requests', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { friend_id, user_id, status, request_id } = req.body || {};
    
    // If status is provided, this is a respond-to-request action
    if (status && request_id) {
      const reqId = BigInt(request_id);
      const friendReq = await prisma.friend_requests.findUnique({ where: { id: reqId } });
      if (!friendReq) return res.status(404).json({ message: 'Friend request not found' });
      if (friendReq.friend_id !== userId) return res.status(403).json({ message: 'Not authorized' });
      
      if (status === 'accepted') {
        await prisma.friend_requests.update({ where: { id: reqId }, data: { status: 'accepted' } });
        await prisma.friends.create({ data: { user_id: friendReq.user_id, friend_id: friendReq.friend_id, status: 'accepted' } });
        await createNotification(friendReq.user_id, 'Friend Request Accepted', `Someone accepted your friend request!`);
        checkAndUnlockAchievements(userId).catch(() => {});
        return res.json({ success: true, message: 'Friend request accepted' });
      } else {
        await prisma.friend_requests.update({ where: { id: reqId }, data: { status: 'rejected' } });
        return res.json({ success: true, message: 'Friend request declined' });
      }
    }
    
    // Otherwise, send a new friend request
    const targetId = friend_id || user_id;
    if (!targetId) return res.status(400).json({ message: 'friend_id or user_id is required' });
    const friendId = BigInt(targetId);
    if (userId === friendId) return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    
    const targetUser = await prisma.users.findUnique({ where: { id: friendId } });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // A block in either direction forbids new friend requests
    const blocked = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: userId, blocked_id: friendId },
          { blocker_id: friendId, blocked_id: userId },
        ],
      },
    });
    if (blocked) return res.status(400).json({ message: 'Cannot send a friend request to this user' });
    
    const existingFriend = await prisma.friends.findFirst({
      where: { OR: [{ user_id: userId, friend_id: friendId }, { user_id: friendId, friend_id: userId }] },
    });
    if (existingFriend) return res.status(400).json({ message: 'Already friends' });
    
    const existingRequest = await prisma.friend_requests.findFirst({
      where: { OR: [{ user_id: userId, friend_id: friendId }, { user_id: friendId, friend_id: userId }], status: 'pending' },
    });
    if (existingRequest) return res.status(400).json({ message: 'Friend request already pending' });
    
    await prisma.friend_requests.create({ data: { user_id: userId, friend_id: friendId, status: 'pending' } });
    await createNotification(friendId, 'New Friend Request', `${(await prisma.users.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'Someone'} wants to be your friend!`);
    res.json({ success: true, message: 'Friend request sent' });
  } catch (error: any) {
    console.error('[Friends] POST /requests error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process friend request' });
  }
});

// POST /api/friends/requests/:id — respond to friend request (frontend compat)
router.post('/requests/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const targetUserId = BigInt(req.params.id);
    const { status } = req.body || {};
    
    if (!status) return res.status(400).json({ message: 'status is required' });
    
    // Find the pending request between these users
    const friendReq = await prisma.friend_requests.findFirst({
      where: {
        OR: [
          { user_id: targetUserId, friend_id: userId, status: 'pending' },
          { user_id: userId, friend_id: targetUserId, status: 'pending' },
        ],
      },
    });
    
    if (!friendReq) return res.status(404).json({ message: 'No pending friend request found' });
    
    if (status === 'accepted' || status === 'accept') {
      await prisma.friend_requests.update({ where: { id: friendReq.id }, data: { status: 'accepted' } });
      await prisma.friends.create({ data: { user_id: friendReq.user_id, friend_id: friendReq.friend_id, status: 'accepted' } });
      await createNotification(friendReq.user_id, 'Friend Request Accepted', 'Your friend request was accepted!');
      checkAndUnlockAchievements(userId).catch(() => {});
      return res.json({ success: true, message: 'Friend request accepted' });
    } else {
      await prisma.friend_requests.update({ where: { id: friendReq.id }, data: { status: 'rejected' } });
      return res.json({ success: true, message: 'Friend request declined' });
    }
  } catch (error: any) {
    console.error('[Friends] Respond error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to respond to friend request' });
  }
});

// POST /api/friends/accept/:id — accept a friend request
router.post('/accept/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const requestId = BigInt(req.params.id);

    const friendRequest = await prisma.friend_requests.findUnique({
      where: { id: requestId },
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.friend_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer pending' });
    }

    // Update request status
    await prisma.friend_requests.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    });

    // Create bidirectional friendship
    await prisma.friends.create({
      data: {
        user_id: friendRequest.user_id,
        friend_id: friendRequest.friend_id,
        status: 'accepted',
      },
    });

    // Notify the requester
    await createNotification(friendRequest.user_id, 'Friend Request Accepted',
      `${(await prisma.users.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'Someone'} accepted your friend request!`);

    
    // Check achievements (first friend)
    checkAndUnlockAchievements(userId).catch(() => {});
    checkAndUnlockAchievements(BigInt(req.params.id)).catch(() => {});
res.json({ success: true, message: 'Friend request accepted' });
  } catch (error: any) {
    console.error('[Friends] Accept error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to accept friend request' });
  }
});

// POST /api/friends/reject/:id — reject a friend request
router.post('/reject/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const requestId = BigInt(req.params.id);

    const friendRequest = await prisma.friend_requests.findUnique({
      where: { id: requestId },
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.friend_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    await prisma.friend_requests.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error: any) {
    console.error('[Friends] Reject error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject friend request' });
  }
});

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
