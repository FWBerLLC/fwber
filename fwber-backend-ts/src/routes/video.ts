import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getIO } from '../socket.js';
import { userRoomName } from '../lib/audio-signaling.js';
import {
  validateVideoSignal,
  buildVideoSignalEvent,
  VIDEO_SIGNAL_EVENT,
} from '../lib/video-signaling.js';

const router = Router();
router.use(authenticate);

async function isBlockedBetween(a: bigint, b: bigint): Promise<boolean> {
  const block = await prisma.blocks.findFirst({
    where: {
      OR: [
        { blocker_id: a, blocked_id: b },
        { blocker_id: b, blocked_id: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

// GET /api/video/history
router.get('/history', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const calls = await prisma.video_calls.findMany({
      where: { OR: [{ caller_id: userId }, { receiver_id: userId }] },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: {
        users_video_calls_caller_idTousers: {
          select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true } } },
        },
        users_video_calls_receiver_idTousers: {
          select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true } } },
        },
      },
    });
    const data = calls.map((call: any) => {
      const isCaller = call.caller_id === userId;
      const otherUser = isCaller
        ? call.users_video_calls_receiver_idTousers
        : call.users_video_calls_caller_idTousers;
      const otherProfile = Array.isArray(otherUser?.user_profiles)
        ? otherUser.user_profiles[0]
        : otherUser?.user_profiles;
      const displayName = otherProfile?.display_name || otherUser?.name || 'Unknown';
      return {
        id: Number(call.id),
        caller_id: Number(call.caller_id),
        receiver_id: Number(call.receiver_id),
        direction: isCaller ? 'outgoing' : 'incoming',
        status: call.status,
        duration: call.duration || 0,
        started_at: call.started_at,
        ended_at: call.ended_at,
        created_at: call.created_at,
        other_user: {
          id: Number(otherUser?.id),
          name: displayName,
          display_name: displayName,
          avatar_url: otherProfile?.avatar_url || null,
        },
        partner_name: displayName,
        partner_avatar: otherProfile?.avatar_url || null,
      };
    });
    res.json({ data, total: data.length });
  } catch (err: any) {
    console.error('[video] history error:', err.message);
    res.json({ data: [], total: 0 });
  }
});

/**
 * POST /api/video/initiate
 * Accepts either `receiver_id` or `recipient_id` (`lib/api/video.ts` sends `recipient_id`),
 * enforces self-call and bidirectional `blocks` guards, logs `video_calls`, and pushes
 * `video_call_incoming` to the recipient's private Socket.IO room.
 */
router.post('/initiate', async (req: any, res) => {
  try {
    const callerIdNum = Number(req.user.id);
    const callerId = BigInt(callerIdNum);
    const rawTarget = req.body?.receiver_id ?? req.body?.recipient_id;
    const targetNum = Number(rawTarget);

    if (!Number.isInteger(targetNum) || targetNum <= 0) {
      return res.status(400).json({ error: 'recipient_id or receiver_id is required' });
    }
    if (targetNum === callerIdNum) {
      return res.status(400).json({ error: 'Cannot initiate a video call with yourself' });
    }

    const receiverId = BigInt(targetNum);
    if (await isBlockedBetween(callerId, receiverId)) {
      return res.status(403).json({ error: 'Cannot initiate a call with this user' });
    }

    const now = new Date();
    const call = await prisma.video_calls.create({
      data: {
        caller_id: callerId,
        receiver_id: receiverId,
        status: 'initiated',
        started_at: now,
        created_at: now,
        updated_at: now,
      },
    });

    const io = getIO();
    if (io) {
      io.to(userRoomName(targetNum)).emit('video_call_incoming', {
        call_id: Number(call.id),
        caller_id: callerIdNum,
        caller_name: req.user?.name || 'Someone',
        started_at: now.toISOString(),
      });
    }

    res.status(201).json({
      id: Number(call.id),
      caller_id: callerIdNum,
      receiver_id: targetNum,
      status: call.status,
      started_at: call.started_at,
      ended_at: call.ended_at,
      duration: call.duration ?? null,
      created_at: call.created_at ?? now,
      message: 'Call initiated',
    });
  } catch (err: any) {
    console.error('[video] initiate error:', err.message);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

/**
 * POST /api/video/signal
 * Validates WebRTC SDP/ICE/teardown payload, checks bidirectional blocks (and optional
 * `call_id` participant membership), and relays `VideoCallSignal` over Socket.IO.
 */
router.post('/signal', async (req: any, res) => {
  try {
    const senderId = Number(req.user.id);
    const validated = validateVideoSignal(req.body, senderId);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    const senderBig = BigInt(senderId);
    const targetBig = BigInt(validated.value.targetUserId);
    if (await isBlockedBetween(senderBig, targetBig)) {
      return res.status(403).json({ error: 'Cannot signal this user' });
    }

    if (validated.value.callId) {
      const call = await prisma.video_calls.findUnique({
        where: { id: BigInt(validated.value.callId) },
      });
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      const isParticipant =
        (call.caller_id === senderBig && call.receiver_id === targetBig) ||
        (call.receiver_id === senderBig && call.caller_id === targetBig);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not a participant in this video call' });
      }
    }

    const eventPayload = buildVideoSignalEvent(senderId, validated.value);
    const io = getIO();
    if (io) {
      io.to(userRoomName(validated.value.targetUserId)).emit(VIDEO_SIGNAL_EVENT, eventPayload);
    }

    return res.json({
      success: true,
      relayed: Boolean(io),
      event: eventPayload,
    });
  } catch (err: any) {
    console.error('[video] signal error:', err.message);
    return res.status(500).json({ error: 'Failed to relay video signal' });
  }
});

/**
 * PUT /api/video/:callId/status
 * Enforces caller/receiver participant authorization (`403` for third parties)
 * and notifies the counterparty over Socket.IO when status changes.
 */
router.put('/:callId/status', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { status, duration } = req.body || {};
    if (!['connected', 'missed', 'rejected', 'ended'].includes(status)) {
      return res.status(422).json({ error: 'Invalid status' });
    }
    const call = await prisma.video_calls.findUnique({ where: { id: BigInt(req.params.callId) } });
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    if (call.caller_id !== userId && call.receiver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this call' });
    }

    const updateData: any = { status, updated_at: new Date() };
    if (status === 'ended') {
      updateData.ended_at = new Date();
      updateData.duration = Number.isFinite(Number(duration)) ? Number(duration) : 0;
    }
    const updated = await prisma.video_calls.update({ where: { id: call.id }, data: updateData });

    const peerId = call.caller_id === userId ? Number(call.receiver_id) : Number(call.caller_id);
    const io = getIO();
    if (io) {
      io.to(userRoomName(peerId)).emit('video_call_status', {
        call_id: Number(call.id),
        status,
        updated_by: Number(userId),
      });
    }

    res.json({
      success: true,
      id: Number(updated.id),
      callId: Number(updated.id),
      caller_id: Number(updated.caller_id),
      receiver_id: Number(updated.receiver_id),
      status: updated.status,
      started_at: updated.started_at,
      ended_at: updated.ended_at,
      duration: updated.duration ?? 0,
      created_at: updated.created_at,
    });
  } catch (err: any) {
    console.error('[video] status error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
