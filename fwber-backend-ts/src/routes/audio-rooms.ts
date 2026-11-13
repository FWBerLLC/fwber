import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { validateAudioSignal, buildAudioSignalEvent, userRoomName, AUDIO_SIGNAL_EVENT } from '../lib/audio-signaling.js';
import { getIO } from '../socket.js';

const router = Router();
router.use(authenticate);

// Helper: serialize BigInt
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

// GET /api/audio-rooms — list active audio rooms
router.get('/', async (req: any, res) => {
  try {
    const rooms = await prisma.audio_rooms.findMany({
      where: { is_active: true },
      include: {
        users: { select: { id: true, name: true } },
        _count: { select: { audio_room_participants: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const data = rooms.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description,
      is_active: r.is_active,
      created_by: Number(r.created_by),
      creator_name: r.users?.name || 'Unknown',
      participant_count: r._count?.audio_room_participants || 0,
      created_at: r.created_at?.toISOString(),
    }));

    res.json({
      data,
      rooms: data,
      meta: {
        ranking_strategy: 'trust-aware',
        total_active: data.length,
      },
    });
  } catch (error: any) {
    console.error('[AudioRooms] List error:', error.message);
    res.json({ data: [], rooms: [], meta: { ranking_strategy: 'trust-aware', total_active: 0 } });
  }
});

// POST /api/audio-rooms — create a new audio room
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await prisma.audio_rooms.create({
      data: {
        name,
        description: description || null,
        created_by: userId,
        is_active: true,
      },
    });

    // Auto-join creator as speaker
    await prisma.audio_room_participants.create({
      data: {
        audio_room_id: room.id,
        user_id: userId,
        role: 'speaker',
        is_muted: false,
      },
    });

    res.json({
      id: Number(room.id),
      name: room.name,
      success: true,
    });
  } catch (error: any) {
    console.error('[AudioRooms] Create error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create room' });
  }
});

// GET /api/audio-rooms/:id — get room details
router.get('/:id', async (req: any, res) => {
  try {
    const roomId = BigInt(req.params.id);

    const room = await prisma.audio_rooms.findUnique({
      where: { id: roomId },
      include: {
        users: { select: { id: true, name: true } },
        audio_room_participants: {
          include: {
            users: { select: { id: true, name: true, avatar_url: true } },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(serialize({
      id: room.id,
      name: room.name,
      description: room.description,
      is_active: room.is_active,
      created_by: room.created_by,
      creator_name: room.users?.name,
      participants: room.audio_room_participants.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.users?.name,
        avatar_url: p.users?.avatar_url,
        role: p.role,
        is_muted: p.is_muted,
      })),
    }));
  } catch (error: any) {
    console.error('[AudioRooms] Get error:', error.message);
    res.status(500).json({ message: 'Failed to get room' });
  }
});

// POST /api/audio-rooms/:id/join — join a room
router.post('/:id/join', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const roomId = BigInt(req.params.id);
    const { role = 'listener' } = req.body;

    const room = await prisma.audio_rooms.findUnique({ where: { id: roomId } });
    if (!room || !room.is_active) {
      return res.status(404).json({ message: 'Room not found or inactive' });
    }

    // Check if already joined
    const existing = await prisma.audio_room_participants.findFirst({
      where: { audio_room_id: roomId, user_id: userId },
    });

    if (existing) {
      // Already in room, return current state
      const participants = await prisma.audio_room_participants.findMany({
        where: { audio_room_id: roomId },
        include: { users: { select: { id: true, name: true, avatar_url: true } } },
      });

      return res.json({
        room: { id: Number(room.id), name: room.name, host_id: Number(room.created_by) },
        participants: serialize(participants.map((p: any) => ({
          id: p.id, user_id: p.user_id, name: p.users?.name,
          avatar_url: p.users?.avatar_url, role: p.role, is_muted: p.is_muted,
        }))),
      });
    }

    await prisma.audio_room_participants.create({
      data: {
        audio_room_id: roomId,
        user_id: userId,
        role: role || 'listener',
        is_muted: true,
      },
    });

    const participants = await prisma.audio_room_participants.findMany({
      where: { audio_room_id: roomId },
      include: { users: { select: { id: true, name: true, avatar_url: true } } },
    });

    res.json({
      room: { id: Number(room.id), name: room.name, host_id: Number(room.created_by) },
      participants: serialize(participants.map((p: any) => ({
        id: p.id, user_id: p.user_id, name: p.users?.name,
        avatar_url: p.users?.avatar_url, role: p.role, is_muted: p.is_muted,
      }))),
    });
  } catch (error: any) {
    console.error('[AudioRooms] Join error:', error.message);
    res.status(500).json({ message: 'Failed to join room' });
  }
});

// POST /api/audio-rooms/:id/leave — leave a room
router.post('/:id/leave', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const roomId = BigInt(req.params.id);

    await prisma.audio_room_participants.deleteMany({
      where: { audio_room_id: roomId, user_id: userId },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
});

// POST /api/audio-rooms/:id/signal — WebRTC signaling relay.
// Validates the signal, confirms BOTH users are participants of this room
// (signals must never leak across rooms or to non-members), then relays to
// the target's Socket.io user room as `AudioRoomSignal`. `relayed` reports
// whether the target currently has a live socket; when false the signal is
// dropped honestly (WebRTC peers must re-offer on reconnect) rather than
// pretending delivery.
router.post('/:id/signal', async (req: any, res) => {
  try {
    const senderId = Number(req.user.id);
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const validated = validateAudioSignal(req.body, senderId);
    if (!validated.ok) {
      return res.status(400).json({ success: false, message: validated.error });
    }
    const { signal } = validated;

    const roomKey = BigInt(roomId);
    const [senderRow, targetRow] = await Promise.all([
      prisma.audio_room_participants.findFirst({ where: { audio_room_id: roomKey, user_id: BigInt(senderId) } }),
      prisma.audio_room_participants.findFirst({ where: { audio_room_id: roomKey, user_id: BigInt(signal.targetUserId) } }),
    ]);
    if (!senderRow) {
      return res.status(403).json({ success: false, message: 'You are not a participant of this room' });
    }
    if (!targetRow) {
      return res.status(404).json({ success: false, message: 'Target user is not a participant of this room' });
    }

    const io = getIO();
    const event = buildAudioSignalEvent(roomId, senderId, signal);
    let relayed = false;
    if (io) {
      const room = io.sockets.adapter.rooms.get(userRoomName(signal.targetUserId));
      relayed = !!room && room.size > 0;
      if (relayed) {
        io.to(userRoomName(signal.targetUserId)).emit(AUDIO_SIGNAL_EVENT, event);
      }
    }

    return res.json({ success: true, relayed, event: AUDIO_SIGNAL_EVENT });
  } catch (error: any) {
    console.error('[AudioRooms] Signal error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to relay signal' });
  }
});

export default router;
