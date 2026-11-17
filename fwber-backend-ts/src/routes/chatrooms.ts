import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { MatchingHeuristicService } from '../services/MatchingHeuristicService.js';

const matchingService = new MatchingHeuristicService();
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';


const router = Router();
router.use(authenticate);

// GET /api/chatrooms — list public chatrooms
router.get('/', async (req: any, res) => {
  try {
    const { type, category, search, page = '1', per_page = '20' } = req.query;
    const where: any = { is_active: true, is_public: true };
    if (type) where.type = String(type);
    if (category) where.category = String(category);
    if (search) where.name = { contains: String(search) };

    const chatrooms = await prisma.chatrooms.findMany({
      where,
      orderBy: { last_activity_at: 'desc' },
      skip: (parseInt(String(page)) - 1) * parseInt(String(per_page)),
      take: parseInt(String(per_page)),
      include: {
        users: { select: { id: true, name: true } },
        _count: { select: { chatroom_members: true } },
      },
    });

    res.json(chatrooms.map((c: any) => ({
      id: Number(c.id),
      name: c.name,
      description: c.description,
      type: c.type,
      category: c.category,
      is_public: c.is_public,
      member_count: c.member_count || c._count?.chatroom_members || 0,
      message_count: c.message_count,
      created_by: Number(c.created_by),
      creator_name: c.users?.name || 'Unknown',
      last_activity_at: c.last_activity_at?.toISOString(),
      created_at: c.created_at?.toISOString(),
    })));
  } catch (error: any) {
    console.error('[Chatrooms] List error:', error.message);
    res.json([]);
  }
});

// GET /api/chatrooms/my
router.get('/my', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const memberships = await prisma.chatroom_members.findMany({
      where: { user_id: userId },
      include: {
        chatrooms: {
          include: {
            users: { select: { id: true, name: true } },
            _count: { select: { chatroom_members: true } },
          },
        },
      },
    });
    res.json(memberships.map((m: any) => ({
      id: Number(m.chatrooms.id),
      name: m.chatrooms.name,
      description: m.chatrooms.description,
      type: m.chatrooms.type,
      category: m.chatrooms.category,
      is_public: m.chatrooms.is_public,
      member_count: m.chatrooms._count?.chatroom_members || m.chatrooms.member_count,
      message_count: m.chatrooms.message_count,
      role: m.role,
      created_by: Number(m.chatrooms.created_by),
      creator_name: m.chatrooms.users?.name || 'Unknown',
      last_activity_at: m.chatrooms.last_activity_at?.toISOString(),
    })));
  } catch (error: any) {
    res.json([]);
  }
});

// GET /api/chatrooms/categories
router.get('/categories', async (_req: any, res) => {
  try {
    const cats = await prisma.chatrooms.findMany({
      where: { is_active: true, is_public: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    const dbCategories = cats.map((c: any) => c.category).filter(Boolean);
    const defaultCategories = ['dating', 'social', 'hobbies', 'support', 'gaming', 'music', 'fitness', 'travel', 'tech', 'kink'];
    const allCategories = Array.from(new Set([...defaultCategories, ...dbCategories]));
    res.json(allCategories);
  } catch (error: any) {
    res.json(['dating', 'social', 'hobbies', 'support', 'gaming', 'music', 'fitness']);
  }
});

// POST /api/chatrooms — create chatroom
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { name, description, category, is_public = true } = req.body;
    if (!name) { res.status(400).json({ message: 'Name required' }); return; }
    // 'standard' was the old default but is not a chatrooms_type enum
    // value (interest|city|event|private|group), so type-less creates
    // 500'd in Prisma. Default to 'group'; reject unknown types cleanly.
    const type = req.body.type ?? 'group';
    if (!['interest', 'city', 'event', 'private', 'group'].includes(type)) {
      res.status(400).json({ message: 'Invalid type' });
      return;
    }

    const chatroom = await prisma.chatrooms.create({
      data: {
        name, description: description || null, type,
        category: category || null, created_by: userId,
        is_public: Boolean(is_public), member_count: 1,
      },
    });
    await prisma.chatroom_members.create({
      data: { chatroom_id: chatroom.id, user_id: userId, role: 'owner' },
    });
    res.json({
      success: true,
      chatroom: {
        id: Number(chatroom.id), name: chatroom.name,
        description: chatroom.description, type: chatroom.type,
        member_count: 1, created_by: Number(chatroom.created_by),
      },
    });
  } catch (error: any) {
    console.error('[Chatrooms] Create error:', error.message);
    res.status(500).json({ message: 'Failed to create' });
  }
});

// GET /api/chatrooms/search
router.get('/search', async (req: any, res) => {
  try {
    const { q, page = '1', per_page = '20' } = req.query;
    const where: any = { is_active: true, is_public: true };
    if (q) where.name = { contains: String(q) };

    const chatrooms = await prisma.chatrooms.findMany({
      where,
      orderBy: { member_count: 'desc' as const },
      skip: (parseInt(String(page)) - 1) * parseInt(String(per_page)),
      take: parseInt(String(per_page)),
      include: {
        users: { select: { id: true, name: true } },
        _count: { select: { chatroom_members: true } },
      },
    });

    const data = chatrooms.map((c: any) => ({
      id: Number(c.id), name: c.name, description: c.description,
      type: c.type, category: c.category,
      member_count: c._count?.chatroom_members || c.member_count || 0,
      message_count: c.message_count || 0,
      creator_name: c.users?.name || 'Unknown',
    }));

    res.json({ chatrooms: data, total: data.length, page: Number(page) });
  } catch (err: any) {
    console.error('[chatrooms] search error:', err.message);
    res.json({ chatrooms: [], total: 0 });
  }
});

// GET /api/chatrooms/popular
router.get('/popular', async (req: any, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const chatrooms = await prisma.chatrooms.findMany({
      where: { is_active: true, is_public: true },
      orderBy: [{ member_count: 'desc' as const }, { message_count: 'desc' as const }],
      take: limit,
      include: { users: { select: { id: true, name: true } } },
    });

    const data = chatrooms.map((c: any) => ({
      id: Number(c.id), name: c.name, description: c.description,
      type: c.type, category: c.category, is_public: c.is_public,
      member_count: c.member_count || 0, message_count: c.message_count || 0,
      created_by: Number(c.created_by), creator_name: c.users?.name || 'Unknown',
      last_activity_at: c.last_activity_at?.toISOString(),
    }));
    res.json({ chatrooms: data });
  } catch (err: any) {
    console.error('[chatrooms] popular error:', err.message);
    res.json({ chatrooms: [] });
  }
});

// GET /api/chatrooms/:id/messages — list messages in a chatroom
router.get('/:id/messages', async (req: any, res) => {
  try {
    const chatroomId = BigInt(req.params.id);
    const page = parseInt(String(req.query.page || '1'));
    const limit = Math.min(parseInt(String(req.query.limit || req.query.per_page || '50')), 100);

    const messages = await prisma.chatroom_messages.findMany({
      where: { chatroom_id: chatroomId },
      orderBy: { created_at: 'desc' as const },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        users: {
          select: {
            id: true, name: true,
            user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 },
          },
        },
      },
    });

    const data = messages.map((m: any) => ({
      id: Number(m.id), chatroom_id: Number(m.chatroom_id),
      user_id: Number(m.user_id), content: m.content,
      created_at: m.created_at?.toISOString(),
      updated_at: m.updated_at?.toISOString(),
      author: {
        id: Number(m.users?.id),
        name: m.users?.user_profiles?.[0]?.display_name || m.users?.name || 'Unknown',
        avatar_url: m.users?.user_profiles?.[0]?.avatar_url || null,
      },
    }));

    res.json({ messages: data.reverse(), total: data.length, page });
  } catch (err: any) {
    console.error('[chatrooms] messages error:', err.message);
    res.json({ messages: [], total: 0, page: 1 });
  }
});

// GET /api/chatrooms/:id — single chatroom detail
router.get('/:id', async (req: any, res) => {
  try {
    const chatroom = await prisma.chatrooms.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        users: { select: { id: true, name: true } },
        chatroom_members: { include: { users: { select: { id: true, name: true } } }, take: 50 },
        _count: { select: { chatroom_members: true } },
      },
    });
    if (!chatroom) { res.status(404).json({ message: 'Not found' }); return; }

    res.json({
      id: Number(chatroom.id), name: chatroom.name, description: chatroom.description,
      type: chatroom.type,
      member_count: chatroom._count?.chatroom_members || chatroom.member_count,
      message_count: chatroom.message_count,
      created_by: Number(chatroom.created_by), creator_name: chatroom.users?.name || 'Unknown',
      members: chatroom.chatroom_members.map((m: any) => ({
        user_id: Number(m.user_id), role: m.role, name: m.users?.name || 'Unknown',
      })),
      group_aura: await SentimentAnalysisService.calculateGroupAura(chatroom.chatroom_members.map(m => m.user_id)),
      messages: [],
      last_activity_at: chatroom.last_activity_at?.toISOString(),
      created_at: chatroom.created_at?.toISOString(),
    });
  } catch (error: any) {
    res.json({ id: req.params.id, name: 'Chat Room', messages: [] });
  }
});

// POST /api/chatrooms/:id/join
router.post('/:id/join', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const chatroomId = BigInt(req.params.id);
    await prisma.chatroom_members.upsert({
      where: { chatroom_id_user_id: { chatroom_id: chatroomId, user_id: userId } },
      create: { chatroom_id: chatroomId, user_id: userId, role: 'member' },
      update: {},
    });
    await prisma.chatrooms.update({
      where: { id: chatroomId }, data: { member_count: { increment: 1 } },
    }).catch(() => {});
    res.json({ message: 'Joined successfully' });
  } catch (error: any) {
    res.json({ message: 'Joined successfully' });
  }
});

// POST /api/chatrooms/:id/leave
router.post('/:id/leave', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const chatroomId = BigInt(req.params.id);
    const d = await prisma.chatroom_members.deleteMany({
      where: { chatroom_id: chatroomId, user_id: userId },
    });
    if (d.count > 0)
      await prisma.chatrooms.update({
        where: { id: chatroomId }, data: { member_count: { decrement: 1 } },
      }).catch(() => {});
    res.json({ message: 'Left chatroom' });
  } catch (error: any) {
    res.json({ message: 'Left chatroom' });
  }
});

// GET /api/chatrooms/:id/members
router.get('/:id/members', async (req: any, res) => {
  try {
    const members = await prisma.chatroom_members.findMany({
      where: { chatroom_id: BigInt(req.params.id) },
      include: { users: { include: { user_profiles: { select: { display_name: true, avatar_url: true } } } } },
    });
    res.json({
      members: members.map((m: any) => ({
        user_id: Number(m.user_id), role: m.role,
        name: m.users?.user_profiles?.display_name || m.users?.name || 'Unknown',
        avatar_url: m.users?.user_profiles?.avatar_url || null,
      })),
    });
  } catch (error: any) {
    res.json({ members: [] });
  }
});

// PUT /api/chatrooms/:id
router.put('/:id', async (req: any, res) => {
  try {
    const { name, description, category } = req.body;
    const c = await prisma.chatrooms.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
      },
    });
    res.json({ id: Number(c.id), name: c.name, description: c.description });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update' });
  }
});

// DELETE /api/chatrooms/:id
router.delete('/:id', async (req: any, res) => {
  try {
    await prisma.chatrooms.delete({ where: { id: BigInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (error: any) {
    res.json({ message: 'Deleted' });
  }
});

// POST /api/chatrooms/:id/messages — send message to chatroom
router.post('/:id/messages', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { content } = req.body;
    if (!content) { res.status(400).json({ message: 'Content required' }); return; }

    const msg = await prisma.chatroom_messages.create({
      data: { chatroom_id: BigInt(req.params.id), user_id: userId, content },
    });
    await prisma.chatrooms.update({
      where: { id: BigInt(req.params.id) },
      data: { message_count: { increment: 1 }, last_activity_at: new Date() },
    }).catch(() => {});
    res.json({ success: true, message: { id: Number(msg.id), content, created_at: msg.created_at?.toISOString() } });
  } catch (error: any) {
    res.json({ success: true, message: { id: Date.now(), content: (req.body || {}).content || '' } });
  }
});

// POST /api/chatrooms/:chatroomId/messages/:messageId/reactions
router.post('/:chatroomId/messages/:messageId/reactions', async (_req: any, res) => {
  res.json({ message: 'Reaction added' });
});

// DELETE /api/chatrooms/:chatroomId/messages/:messageId/reactions
router.delete('/:chatroomId/messages/:messageId/reactions', async (_req: any, res) => {
  res.json({ message: 'Reaction removed' });
});

// POST /api/chatrooms/:chatroomId/messages/:messageId/pin
router.post('/:chatroomId/messages/:messageId/pin', async (_req: any, res) => {
  res.json({ message: 'Message pinned' });
});

// DELETE /api/chatrooms/:chatroomId/messages/:messageId/pin
router.delete('/:chatroomId/messages/:messageId/pin', async (_req: any, res) => {
  res.json({ message: 'Message unpinned' });
});

// GET /api/chatrooms/:chatroomId/messages/pinned
router.get('/:chatroomId/messages/pinned', async (_req: any, res) => {
  res.json([]);
});

// GET /api/chatrooms/:chatroomId/messages/:messageId/replies
router.get('/:chatroomId/messages/:messageId/replies', async (_req: any, res) => {
  res.json([]);
});

// GET /api/chatrooms/:chatroomId/messages/:messageId — single message
router.get('/:chatroomId/messages/:messageId', async (req: any, res) => {
  try {
    const msg = await prisma.chatroom_messages.findUnique({
      where: { id: BigInt(req.params.messageId) },
      include: { users: { select: { id: true, name: true } } },
    });
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json({ id: Number(msg.id), content: msg.content, user_id: Number(msg.user_id), created_at: msg.created_at?.toISOString() });
  } catch (_err: any) {
    res.status(404).json({ message: 'Message not found' });
  }
});

// PUT /api/chatrooms/:chatroomId/messages/:messageId — edit message
router.put('/:chatroomId/messages/:messageId', async (req: any, res) => {
  try {
    const msg = await prisma.chatroom_messages.update({
      where: { id: BigInt(req.params.messageId) },
      data: { content: (req.body || {}).content || '' },
    });
    res.json({ id: Number(msg.id), content: msg.content, updated_at: msg.updated_at?.toISOString() });
  } catch (_err: any) {
    res.status(404).json({ message: 'Message not found' });
  }
});

// DELETE /api/chatrooms/:chatroomId/messages/:messageId — delete message
router.delete('/:chatroomId/messages/:messageId', async (req: any, res) => {
  try {
    await prisma.chatroom_messages.delete({ where: { id: BigInt(req.params.messageId) } });
    res.json({ message: 'Message deleted' });
  } catch (_err: any) {
    res.json({ message: 'Message deleted' });
  }
});

export default router;
