import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const router = Router();

// POST /api/viral-content — create a shared content entry
router.post('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { type, content } = req.body;
    if (!type || !content) return res.status(400).json({ error: 'type and content are required' });

    const id = crypto.randomUUID();
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true, user_profiles: { select: { display_name: true }, take: 1 } },
    });

    const contentWithUser = {
      ...content,
      user_name: user?.user_profiles?.[0]?.display_name || user?.name || 'Anonymous',
      user_id: Number(userId),
    };

    const record = await prisma.viral_contents.create({
      data: {
        id,
        user_id: userId,
        type,
        content: contentWithUser as any,
        views: 0,
        reward_claimed: false,
      },
    });

    res.json({
      id: record.id,
      type: record.type,
      share_url: `https://www.fwber.site/share/${record.id}`,
      created_at: record.created_at?.toISOString(),
    });
  } catch (err: any) {
    console.error('[viral-content] create error:', err.message);
    res.status(500).json({ error: 'Failed to create shared content' });
  }
});

// POST /api/viral-content/:id/claim — claim reward for viral content
router.post('/:id/claim', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const record = await prisma.viral_contents.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ error: 'Content not found' });
    if (record.user_id !== userId) return res.status(403).json({ error: 'Not your content' });
    if (record.reward_claimed) return res.status(400).json({ error: 'Reward already claimed' });

    const rewardTokens = Math.min(Math.floor(record.views / 100) * 5, 50);
    if (rewardTokens <= 0) return res.json({ message: 'Not enough views for reward yet', views: record.views });

    await prisma.$transaction([
      prisma.viral_contents.update({
        where: { id: req.params.id },
        data: { reward_claimed: true },
      }),
      prisma.users.update({
        where: { id: userId },
        data: { token_balance: { increment: rewardTokens } },
      }),
      prisma.wallet_transactions.create({
        data: {
          user_id: userId,
          type: 'viral_reward',
          amount: rewardTokens,
          description: `Viral content reward (${record.views} views)`,
          created_at: new Date(),
        },
      }),
    ]);

    res.json({ message: 'Reward claimed!', tokens: rewardTokens, views: record.views });
  } catch (err: any) {
    console.error('[viral-content] claim error:', err.message);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// GET /api/viral-content/mine — list user's viral content
router.get('/mine', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const records = await prisma.viral_contents.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' as const },
      take: 20,
    });
    res.json({
      items: records.map((r: any) => ({
        id: r.id, type: r.type,
        views: r.views, reward_claimed: r.reward_claimed,
        created_at: r.created_at?.toISOString(),
        share_url: `https://www.fwber.site/share/${r.id}`,
      })),
      total: records.length,
    });
  } catch (err: any) {
    console.error('[viral-content] mine error:', err.message);
    res.json({ items: [], total: 0 });
  }
});

// GET /api/viral-content/:id — Retrieve shared content
router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.viral_contents.findUnique({
      where: { id: req.params.id },
    });
    if (!record) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Increment view count
    await prisma.viral_contents.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
    }).catch(() => {});

    const userId = (req as any).user?.id;
    const content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content;

    res.json({
      id: record.id,
      type: record.type,
      content,
      created_at: record.created_at?.toISOString(),
      views: record.views + 1,
      is_owner: userId ? String(record.user_id) === String(userId) : false,
      reward_claimed: record.reward_claimed,
      user_name: content.user_name || null,
      share_url: `https://www.fwber.site/share/${record.id}`,
    });
  } catch (err: any) {
    console.error('[viral-content]', err.message);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

export default router;
