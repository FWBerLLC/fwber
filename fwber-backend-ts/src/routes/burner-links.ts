import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { pushToUser } from '../socket.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

function getFrontendBase(): string {
  const raw = process.env.FRONTEND_URL || 'https://fwber.online';
  return raw.replace(/\/+$/, '');
}

/**
 * Provisions a private 24-hour burner chatroom linking `creatorId` and `scannerId`
 * when a Burner Bridge QR/URL is scanned for the first time.
 *
 * Prior to v2.3.95, `POST /api/burner-links/:token/join` marked `used_at` without
 * creating a `chatrooms` row, returning `chatroom_id: undefined` and sending the
 * scanner to `/chatrooms/undefined` (`app/(protected)/burner/join/[token]/page.tsx`).
 */
async function claimBurnerLinkAndCreateChatroom(link: any, scannerId: bigint) {
  const now = new Date();
  let chatroomId = link.chatroom_id ? BigInt(link.chatroom_id) : null;

  if (!chatroomId) {
    const code = String(link.token || '').slice(0, 6).toUpperCase();
    const chatroom = await prisma.chatrooms.create({
      data: {
        name: `Burner Bridge #${code}`,
        description: 'Temporary encrypted 24-hour Burner Bridge conversation.',
        type: 'private',
        category: 'burner',
        created_by: link.creator_id,
        is_public: false,
        is_active: true,
        member_count: 2,
        message_count: 0,
        last_activity_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    chatroomId = chatroom.id;

    await prisma.chatroom_members.createMany({
      data: [
        {
          chatroom_id: chatroomId,
          user_id: link.creator_id,
          role: 'admin',
          joined_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          chatroom_id: chatroomId,
          user_id: scannerId,
          role: 'member',
          joined_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.burner_links.update({
    where: { id: link.id },
    data: {
      scanner_id: scannerId,
      chatroom_id: chatroomId,
      used_at: now,
      updated_at: now,
    },
  });

  pushToUser(Number(link.creator_id), 'burner_link_joined', {
    token: link.token,
    chatroom_id: Number(chatroomId),
    scanner_id: Number(scannerId),
  });

  return Number(chatroomId);
}

// GET /api/burner-links — List burner links created by the authenticated user
router.get('/', async (req: any, res) => {
  try {
    const links = await prisma.burner_links.findMany({
      where: { creator_id: BigInt(req.user.id) },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: {
        users_burner_links_scanner_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true } },
          },
        },
      },
    });
    const fe = getFrontendBase();
    const now = new Date();
    const data = links.map((l: any) => {
      const s = l.users_burner_links_scanner_idTousers;
      const sp = Array.isArray(s?.user_profiles) ? s.user_profiles[0] : s?.user_profiles;
      const isExpired = l.expires_at ? now > new Date(l.expires_at) : false;
      const createdAtIso = l.created_at instanceof Date ? l.created_at.toISOString() : l.created_at;
      const expiresAtIso = l.expires_at instanceof Date ? l.expires_at.toISOString() : l.expires_at;
      return {
        id: Number(l.id),
        name: `Burner Link #${Number(l.id)}`,
        token: l.token,
        url: `${fe}/burner/join/${l.token}`,
        chatroom_id: l.chatroom_id ? Number(l.chatroom_id) : null,
        expires_at: expiresAtIso,
        expiresAt: expiresAtIso,
        used_at: l.used_at instanceof Date ? l.used_at.toISOString() : l.used_at,
        isExpired,
        views: l.used_at ? 1 : 0,
        scanner: l.scanner_id
          ? {
              id: Number(s?.id),
              name: sp?.display_name || s?.name || 'Anonymous',
              avatar_url: sp?.avatar_url || null,
            }
          : null,
        created_at: createdAtIso,
        createdAt: createdAtIso,
      };
    });
    res.json(data);
  } catch (err: any) {
    console.error('[BurnerLinks] List error:', err.message);
    res.json([]);
  }
});

// POST /api/burner-links — Generate a new disposable burner link
router.post('/', async (req: any, res) => {
  try {
    const rawHours = parseInt((req.body || {}).expires_in_hours as string, 10);
    const hours = Math.max(1, Math.min(Number.isFinite(rawHours) ? rawHours : 24, 72));
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + hours * 3600000);
    const link = await prisma.burner_links.create({
      data: {
        creator_id: BigInt(req.user.id),
        token,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      },
    });
    const fe = getFrontendBase();
    res.status(201).json({
      id: Number(link.id),
      name: `Burner Link #${Number(link.id)}`,
      token: link.token,
      url: `${fe}/burner/join/${link.token}`,
      expires_at: expiresAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      created_at: now.toISOString(),
      createdAt: now.toISOString(),
      views: 0,
      isExpired: false,
      message: 'Share this link for a private conversation',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create burner link', details: err.message });
  }
});

// GET /api/burner-links/:token/status — Lightweight poll endpoint for `/burner` QR creator
router.get('/:token/status', async (req: any, res) => {
  try {
    const link = await prisma.burner_links.findUnique({ where: { token: req.params.token } });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    if (link.creator_id !== BigInt(req.user.id) && link.scanner_id !== BigInt(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized to inspect this burner link' });
    }
    return res.json({
      token: link.token,
      used: Boolean(link.used_at),
      expired: new Date() > link.expires_at,
      chatroom_id: link.chatroom_id ? Number(link.chatroom_id) : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to check burner link status', details: err.message });
  }
});

// POST /api/burner-links/:token/scan
router.post('/:token/scan', async (req: any, res) => {
  try {
    const link = await prisma.burner_links.findUnique({ where: { token: req.params.token } });
    if (!link) return res.status(404).json({ error: 'Link not found', message: 'Link not found' });
    if (link.used_at) return res.status(410).json({ error: 'Link already used', message: 'Link already used' });
    if (new Date() > link.expires_at) return res.status(410).json({ error: 'Link expired', message: 'Link expired' });
    if (link.creator_id === BigInt(req.user.id)) {
      return res.status(400).json({ error: 'Cannot scan your own link', message: 'Cannot scan your own link' });
    }
    const chatroomId = await claimBurnerLinkAndCreateChatroom(link, BigInt(req.user.id));
    return res.json({ message: 'Link scanned! You can now chat.', chatroom_id: chatroomId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to scan link', details: err.message });
  }
});

// POST /api/burner-links/:token/join — Alias for scan (`app/(protected)/burner/join/[token]/page.tsx`)
router.post('/:token/join', async (req: any, res) => {
  try {
    const link = await prisma.burner_links.findUnique({ where: { token: req.params.token } });
    if (!link) return res.status(404).json({ error: 'Link not found', message: 'Link not found' });
    if (link.used_at) return res.status(410).json({ error: 'Link already used', message: 'Link already used' });
    if (new Date() > link.expires_at) return res.status(410).json({ error: 'Link expired', message: 'Link expired' });
    if (link.creator_id === BigInt(req.user.id)) {
      return res.status(400).json({ error: 'Cannot join your own link', message: 'Cannot join your own link' });
    }
    const chatroomId = await claimBurnerLinkAndCreateChatroom(link, BigInt(req.user.id));
    return res.json({ message: 'Joined successfully!', chatroom_id: chatroomId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to join', details: err.message });
  }
});

// DELETE /api/burner-links/:id — Revoke and delete a burner link (`app/burner-links/page.tsx`)
router.delete('/:id', async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid burner link ID' });
    }
    const linkId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const link = await prisma.burner_links.findUnique({ where: { id: linkId } });
    if (!link) return res.status(404).json({ error: 'Burner link not found' });
    if (link.creator_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to revoke this burner link' });
    }

    await prisma.burner_links.delete({ where: { id: linkId } });
    if (link.chatroom_id) {
      await prisma.chatrooms.update({
        where: { id: link.chatroom_id },
        data: { is_active: false, updated_at: new Date() },
      }).catch(() => {});
    }

    return res.json({ success: true, id: Number(linkId) });
  } catch (err: any) {
    console.error('[BurnerLinks] Revoke error:', err.message);
    return res.status(500).json({ error: 'Failed to revoke burner link' });
  }
});

export default router;
