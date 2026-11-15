import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getIO, pushNotification } from '../socket.js';
import { userRoomName } from '../lib/audio-signaling.js';

const router = Router();
router.use(authenticate);

/**
 * HTTP-to-Socket.IO Realtime Bridge (`/api/websocket/*`)
 *
 * `lib/websocket/client.ts` and `lib/hooks/use-pusher-logic.ts` fall back to HTTP POSTs
 * (`/websocket/connect`, `/message`, `/typing`, `/presence`, `/notification`) when E2E
 * message framing or Pusher-compatible hooks are active. Mounting these routes ensures
 * HTTP fallback traffic persists messages with block checks and relays events over
 * Socket.IO instead of silently hitting the `200 []` catch-all.
 */

router.post('/connect', async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const now = new Date();
  await prisma.users.update({
    where: { id: userId },
    data: { last_seen_at: now, last_active_at: now },
  }).catch(() => {});

  return res.json({
    connected: true,
    connection_id: `http-bridge-${req.user.id}`,
    user_id: Number(req.user.id),
    ws_url: process.env.WS_PUBLIC_URL || 'wss://ws.fwber.online',
    timestamp: now.toISOString(),
  });
});

router.post('/message', async (req: any, res) => {
  try {
    const senderIdNum = Number(req.user.id);
    const senderId = BigInt(senderIdNum);
    const rawRecipient = req.body?.recipient_id ?? req.body?.receiver_id;
    const recipientNum = Number(rawRecipient);
    if (!Number.isInteger(recipientNum) || recipientNum <= 0) {
      return res.status(400).json({ error: 'recipient_id is required' });
    }

    const receiverId = BigInt(recipientNum);
    const blocked = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: senderId, blocked_id: receiverId },
          { blocker_id: receiverId, blocked_id: senderId },
        ],
      },
      select: { id: true },
    });
    if (blocked) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }

    const msgObj = req.body?.message && typeof req.body.message === 'object' ? req.body.message : req.body;
    const content = String(msgObj?.content || '').trim();
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const rawMsgType = String(msgObj?.type || msgObj?.message_type || 'text');
    const validMsgType = (['text', 'image', 'video', 'audio', 'file'].includes(rawMsgType)
      ? rawMsgType
      : 'text') as any;

    const now = new Date();
    const created = await prisma.messages.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        message_type: validMsgType,
        is_encrypted: Boolean(msgObj?.is_encrypted),
        sent_at: now,
        created_at: now,
        updated_at: now,
      },
    });

    const io = getIO();
    if (io) {
      io.to(userRoomName(recipientNum)).emit('new_message', {
        id: Number(created.id),
        senderId: senderIdNum,
        content: created.content,
        message_type: created.message_type,
        is_encrypted: created.is_encrypted,
        createdAt: (created.created_at || now).toISOString(),
      });
    }

    return res.status(201).json({
      success: true,
      id: Number(created.id),
      sender_id: senderIdNum,
      receiver_id: recipientNum,
      created_at: (created.created_at || now).toISOString(),
    });
  } catch (err: any) {
    console.error('[websocket] POST /message error:', err.message);
    return res.status(500).json({ error: 'Failed to deliver message' });
  }
});

router.post('/typing', async (req: any, res) => {
  const senderIdNum = Number(req.user.id);
  const recipientNum = Number(req.body?.recipient_id ?? req.body?.receiver_id);
  const isTyping = req.body?.is_typing !== false;
  const io = getIO();
  if (io && Number.isInteger(recipientNum) && recipientNum > 0) {
    io.to(userRoomName(recipientNum)).emit(isTyping ? 'user_typing' : 'user_stop_typing', {
      senderId: senderIdNum,
      chatroomId: req.body?.chatroom_id ?? null,
    });
  }
  return res.json({ success: true });
});

router.post('/presence', async (req: any, res) => {
  try {
    const userIdNum = Number(req.user.id);
    const status = String(req.body?.status || 'online');
    const now = new Date();
    await prisma.users.update({
      where: { id: BigInt(userIdNum) },
      data: { last_seen_at: now, last_active_at: now },
    }).catch(() => {});

    const io = getIO();
    if (io) {
      io.emit(status === 'offline' ? 'user_offline' : 'presence_update', {
        userId: userIdNum,
        status,
        metadata: req.body?.metadata ?? null,
        timestamp: now.toISOString(),
      });
    }
    return res.json({ success: true, status, updated_at: now.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update presence' });
  }
});

router.post('/notification', async (req: any, res) => {
  const recipientNum = Number(req.body?.recipient_id ?? req.body?.receiver_id);
  if (!Number.isInteger(recipientNum) || recipientNum <= 0) {
    return res.status(400).json({ error: 'recipient_id is required' });
  }
  pushNotification(recipientNum, {
    ...(typeof req.body?.notification === 'object' && req.body.notification ? req.body.notification : {}),
    sender_id: Number(req.user.id),
  });
  return res.json({ success: true });
});

export default router;
