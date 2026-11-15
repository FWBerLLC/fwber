import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma, { serialize } from '../lib/prisma.js';
import { FederationService } from '../services/FederationService.js';

const router = Router();
const federationService = new FederationService();
router.use(authenticate);

function slugifyBoardLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'community-board';
}

// GET /api/bulletin-boards — list topics as local/community bulletin boards
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(req.query.per_page) || 24));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const where: any = {};
    if (search) {
      where.OR = [
        { label: { contains: search } },
        { slug: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (category && category !== 'all') {
      where.category = category;
    }

    const [totalCount, topics, follows, activeArtifacts] = await Promise.all([
      prisma.topics.count({ where }).catch(() => 0),
      prisma.topics.findMany({
        where,
        orderBy: [{ follower_count: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { topic_user_follows: true } } },
      }),
      prisma.topic_user_follows.findMany({
        where: { user_id: userId },
        select: { topic_id: true },
      }),
      prisma.proximity_artifacts.findMany({
        where: {
          type: 'board_post',
          moderation_status: 'clean',
          expires_at: { gt: new Date() },
        },
        select: { meta: true },
        take: 500,
      }).catch(() => []),
    ]);

    const followedIds = new Set(follows.map((f: any) => f.topic_id.toString()));
    const postCountBySlug = new Map<string, number>();
    for (const art of activeArtifacts as any[]) {
      const slug = typeof art.meta === 'object' && art.meta !== null ? String((art.meta as any).topic_slug || '') : '';
      if (slug) {
        postCountBySlug.set(slug, (postCountBySlug.get(slug) || 0) + 1);
      }
    }

    const boards = topics.map((t: any) => {
      const postCount = postCountBySlug.get(t.slug) || 0;
      const followerCount = Math.max(Number(t.follower_count || 0), Number(t._count?.topic_user_follows || 0));
      return {
        id: Number(t.id),
        slug: t.slug,
        name: t.label,
        label: t.label,
        emoji: t.emoji || '📌',
        category: t.category || 'community',
        description: t.description || `Community bulletin board for ${t.label}.`,
        follower_count: followerCount,
        post_count: postCount,
        postCount,
        is_followed: followedIds.has(t.id.toString()),
      };
    });

    res.json({
      boards,
      meta: {
        total: totalCount || boards.length,
        page,
        per_page: perPage,
      },
    });
  } catch (error: any) {
    console.error('[BulletinBoards] List error:', error.message);
    res.json({ boards: [], meta: { total: 0, page: 1, per_page: 24 } });
  }
});

// POST /api/bulletin-boards/boards — create a new community bulletin board (topic)
router.post('/boards', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const rawLabel = typeof req.body?.name === 'string'
      ? req.body.name.trim()
      : (typeof req.body?.label === 'string' ? req.body.label.trim() : '');
    const category = typeof req.body?.category === 'string' && req.body.category.trim()
      ? req.body.category.trim().toLowerCase().slice(0, 64)
      : 'community';
    const emoji = typeof req.body?.emoji === 'string' && req.body.emoji.trim()
      ? req.body.emoji.trim().slice(0, 16)
      : '📌';
    const description = typeof req.body?.description === 'string' && req.body.description.trim()
      ? req.body.description.trim().slice(0, 500)
      : `Local discussion & announcements for ${rawLabel}.`;

    if (!rawLabel || rawLabel.length < 2) {
      return res.status(400).json({ message: 'Board name must be at least 2 characters' });
    }

    let slug = slugifyBoardLabel(rawLabel);
    const existing = await prisma.topics.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const now = new Date();
    const created = await prisma.topics.create({
      data: {
        slug,
        label: rawLabel.slice(0, 120),
        emoji,
        category,
        description,
        follower_count: 1,
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.topic_user_follows.upsert({
      where: { topic_id_user_id: { topic_id: created.id, user_id: userId } },
      create: { topic_id: created.id, user_id: userId, followed_at: now, created_at: now, updated_at: now },
      update: {},
    });

    res.status(201).json(serialize({
      board: {
        id: Number(created.id),
        slug: created.slug,
        name: created.label,
        label: created.label,
        emoji: created.emoji || '📌',
        category: created.category || 'community',
        description: created.description,
        follower_count: 1,
        post_count: 0,
        postCount: 0,
        is_followed: true,
      },
    }));
  } catch (error: any) {
    console.error('[BulletinBoards] Create board error:', error.message);
    res.status(500).json({ message: 'Failed to create bulletin board' });
  }
});

// DELETE /api/bulletin-boards/posts/:id — delete own board post
router.delete('/posts/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    const postId = BigInt(req.params.id);

    const artifact = await prisma.proximity_artifacts.findUnique({
      where: { id: postId },
    });

    if (!artifact || artifact.type !== 'board_post') {
      return res.status(404).json({ message: 'Board post not found' });
    }

    const isModerator = req.user?.role === 'admin' || req.user?.role === 'moderator';
    if (artifact.user_id !== userId && !isModerator) {
      return res.status(403).json({ message: 'You can only delete your own board posts' });
    }

    await prisma.proximity_artifacts.delete({
      where: { id: postId },
    });

    res.json({ success: true, deleted_id: Number(postId) });
  } catch (error: any) {
    console.error('[BulletinBoards] Delete post error:', error.message);
    res.status(500).json({ message: 'Failed to delete board post' });
  }
});

// GET /api/bulletin-boards/:slug — get topic details + active posts
router.get('/:slug', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const slug = String(req.params.slug);

    const topic = await prisma.topics.findUnique({ where: { slug } });
    if (!topic) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Support both raw MySQL in production and mocked Prisma in unit tests
    let posts: any[] = [];
    try {
      const postsRaw: any[] = await prisma.$queryRawUnsafe(
        `SELECT pa.id, pa.content, pa.created_at, pa.user_id,
        COALESCE(up.display_name, u.name) as author_name,
        up.avatar_url as author_avatar
        FROM proximity_artifacts pa
        LEFT JOIN users u ON pa.user_id = u.id
        LEFT JOIN user_profiles up ON up.user_id = pa.user_id
        WHERE pa.type = 'board_post'
          AND JSON_EXTRACT(pa.meta, '$.topic_slug') = ?
          AND pa.moderation_status = 'clean'
          AND pa.expires_at > NOW()
        ORDER BY pa.created_at DESC
        LIMIT 30`,
        slug
      );

      posts = (postsRaw || []).map((p: any) => {
        const authorId = typeof p.user_id === 'bigint' ? Number(p.user_id) : (parseInt(String(p.user_id), 10) || 0);
        return {
          id: Number(p.id),
          content: p.content,
          created_at: p.created_at,
          is_mine: BigInt(authorId) === userId,
          author: {
            id: authorId,
            name: p.author_name || 'Member',
            avatar_url: p.author_avatar || null,
          },
        };
      });
    } catch {
      const fallbackRows = await prisma.proximity_artifacts.findMany({
        where: {
          type: 'board_post',
          moderation_status: 'clean',
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      });
      posts = fallbackRows
        .filter((r: any) => (r.meta as any)?.topic_slug === slug)
        .map((r: any) => ({
          id: Number(r.id),
          content: r.content,
          created_at: r.created_at,
          is_mine: r.user_id === userId,
          author: {
            id: r.user_id ? Number(r.user_id) : 0,
            name: 'Member',
            avatar_url: null,
          },
        }));
    }

    const isFollowed = await prisma.topic_user_follows.findFirst({
      where: { user_id: userId, topic_id: topic.id },
    });

    res.json(serialize({
      ...topic,
      id: Number(topic.id),
      name: topic.label,
      is_followed: Boolean(isFollowed),
      post_count: posts.length,
      posts,
    }));
  } catch (error: any) {
    console.error('[BulletinBoards] Get error:', error.message);
    res.status(500).json({ message: 'Failed to fetch bulletin board' });
  }
});

// POST /api/bulletin-boards/:slug/follow — idempotently follow a board
router.post('/:slug/follow', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const slug = String(req.params.slug);
    const topic = await prisma.topics.findUnique({ where: { slug } });
    if (!topic) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const existing = await prisma.topic_user_follows.findFirst({
      where: { topic_id: topic.id, user_id: userId },
    });

    if (!existing) {
      const now = new Date();
      await prisma.topic_user_follows.create({
        data: { topic_id: topic.id, user_id: userId, followed_at: now, created_at: now, updated_at: now },
      });
      await prisma.topics.update({
        where: { id: topic.id },
        data: { follower_count: { increment: 1 } },
      });
    }

    res.json({ success: true, is_followed: true });
  } catch (error: any) {
    console.error('[BulletinBoards] Follow error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to follow board' });
  }
});

// DELETE /api/bulletin-boards/:slug/follow — idempotently unfollow a board
router.delete('/:slug/follow', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const slug = String(req.params.slug);
    const topic = await prisma.topics.findUnique({ where: { slug } });
    if (!topic) {
      return res.json({ success: true, is_followed: false });
    }

    const deleted = await prisma.topic_user_follows.deleteMany({
      where: { topic_id: topic.id, user_id: userId },
    });

    if (deleted.count > 0 && Number(topic.follower_count || 0) > 0) {
      await prisma.topics.update({
        where: { id: topic.id },
        data: { follower_count: { decrement: 1 } },
      });
    }

    res.json({ success: true, is_followed: false });
  } catch (error: any) {
    console.error('[BulletinBoards] Unfollow error:', error.message);
    res.json({ success: true, is_followed: false });
  }
});

// POST /api/bulletin-boards — create a board post
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { topic_slug, content, latitude, longitude } = req.body || {};
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    if (!trimmedContent) {
      return res.status(400).json({ message: 'Content is required' });
    }
    if (trimmedContent.length > 2000) {
      return res.status(400).json({ message: 'Content must be 2000 characters or fewer' });
    }

    let resolvedSlug = typeof topic_slug === 'string' && topic_slug.trim() ? topic_slug.trim() : 'general';

    // Ensure the target topic exists so board_post never orphans when database starts fresh
    const existingTopic = await prisma.topics.findUnique({ where: { slug: resolvedSlug } });
    if (!existingTopic && resolvedSlug === 'general') {
      const now = new Date();
      await prisma.topics.create({
        data: {
          slug: 'general',
          label: 'General Community',
          emoji: '💬',
          category: 'community',
          description: 'Open neighborhood announcements, meetups, and community updates.',
          follower_count: 1,
          created_at: now,
          updated_at: now,
        },
      }).catch(() => null);
    }

    const artifact = await prisma.proximity_artifacts.create({
      data: {
        user_id: userId,
        type: 'board_post',
        content: trimmedContent,
        location_lat: Number.isFinite(Number(latitude)) ? Number(latitude) : 42.3314,
        location_lng: Number.isFinite(Number(longitude)) ? Number(longitude) : -83.0458,
        visibility_radius_m: 50000,
        moderation_status: 'clean',
        meta: { topic_slug: resolvedSlug },
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const profile = await prisma.user_profiles.findFirst({ where: { user_id: userId } }).catch(() => null);
    if (profile?.is_federated) {
      const apiDomain = process.env.API_DOMAIN || 'api.fwber.online';
      federationService.broadcastUpdate(userId, {
        id: `https://${apiDomain}/api/proximity/artifacts/${artifact.id}`,
        type: 'Note',
        content: trimmedContent,
        published: artifact.created_at?.toISOString(),
        tag: resolvedSlug ? [{ type: 'Hashtag', href: `https://${apiDomain}/api/bulletin-boards/${resolvedSlug}`, name: `#${resolvedSlug}` }] : [],
      }).catch((err) => console.error('[BulletinBoards] Federation broadcast failed:', err.message));
    }

    res.status(201).json({
      success: true,
      id: Number(artifact.id),
      topic_slug: resolvedSlug,
    });
  } catch (error: any) {
    console.error('[BulletinBoards] Post error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

export default router;
