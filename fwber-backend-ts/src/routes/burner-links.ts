import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// GET /api/burner-links
router.get('/', async (req: any, res) => {
  try {
    const links = await prisma.burner_links.findMany({
      where: { creator_id: BigInt(req.user.id), expires_at: { gt: new Date() }, used_at: null },
      orderBy: { created_at: 'desc' }, take: 20,
      include: { users_burner_links_scanner_idTousers: { select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true } } } } }
    });
    const fe = process.env.FRONTEND_URL || 'https://www.fwber.site';
    const data = links.map((l: any) => {
      const s = l.users_burner_links_scanner_idTousers;
      const sp = Array.isArray(s?.user_profiles) ? s.user_profiles[0] : s?.user_profiles;
      return {
        id: Number(l.id), token: l.token, url: `${fe}/burner/join/${l.token}`,
        expires_at: l.expires_at, used_at: l.used_at,
        scanner: l.scanner_id ? { id: Number(s?.id), name: sp?.display_name || s?.name || 'Anonymous', avatar_url: sp?.avatar_url || null } : null,
        created_at: l.created_at
      };
    });
    res.json(data);
  } catch (err: any) { res.json([]); }
});

// POST /api/burner-links
router.post('/', async (req: any, res) => {
  try {
    const hours = Math.min(parseInt((req.body || {}).expires_in_hours as string) || 24, 72);
    const token = crypto.randomBytes(16).toString('hex');
    const link = await prisma.burner_links.create({
      data: { creator_id: BigInt(req.user.id), token, expires_at: new Date(Date.now() + hours * 3600000) }
    });
    const fe = process.env.FRONTEND_URL || 'https://www.fwber.site';
    res.status(201).json({ id: Number(link.id), token: link.token, url: `${fe}/burner/join/${link.token}`, expires_at: link.expires_at, created_at: link.created_at, message: 'Share this link for a private conversation' });
  } catch (err: any) { res.status(500).json({ error: "Failed to create burner link", details: err.message }); }
});

// POST /api/burner-links/:token/scan
router.post('/:token/scan', async (req: any, res) => {
  try {
    const link = await prisma.burner_links.findUnique({ where: { token: req.params.token } });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    if (link.used_at) return res.status(410).json({ error: 'Link already used' });
    if (new Date() > link.expires_at) return res.status(410).json({ error: 'Link expired' });
    if (link.creator_id === BigInt(req.user.id)) return res.status(400).json({ error: 'Cannot scan your own link' });
    await prisma.burner_links.update({ where: { id: link.id }, data: { scanner_id: BigInt(req.user.id), used_at: new Date() } });
    res.json({ message: 'Link scanned! You can now chat.' });
  } catch (err: any) { res.status(500).json({ error: "Failed to scan link", details: err.message }); }
});

// POST /api/burner-links/:token/join - Alias for scan (frontend compat)
router.post("/:token/join", async (req: any, res) => {
  try {
    const link = await prisma.burner_links.findUnique({ where: { token: req.params.token } });
    if (!link) return res.status(404).json({ error: "Link not found" });
    if (link.used_at) return res.status(410).json({ error: "Link already used" });
    if (new Date() > link.expires_at) return res.status(410).json({ error: "Link expired" });
    if (link.creator_id === BigInt(req.user.id)) return res.status(400).json({ error: "Cannot join your own link" });
    await prisma.burner_links.update({ where: { id: link.id }, data: { scanner_id: BigInt(req.user.id), used_at: new Date() } });
    res.json({ message: "Joined successfully!", chatroom_id: link.chatroom_id ? Number(link.chatroom_id) : undefined });
  } catch (err: any) { res.status(500).json({ error: "Failed to join", details: err.message }); }
});

export default router;
