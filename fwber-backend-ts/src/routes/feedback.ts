import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

function classifySentiment(text: string): { sentiment: 'positive' | 'neutral' | 'negative'; summary: string } {
  const lower = text.toLowerCase();
  const posWords = ['love', 'great', 'awesome', 'fast', 'smooth', 'helpful', 'amazing', 'good', 'thank'];
  const negWords = ['bug', 'broken', 'crash', 'slow', 'error', 'fail', 'bad', 'stuck', 'confusing'];
  let score = 0;
  for (const w of posWords) if (lower.includes(w)) score += 1;
  for (const w of negWords) if (lower.includes(w)) score -= 1;
  const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  const summary =
    sentiment === 'positive'
      ? 'Positive user experience feedback'
      : sentiment === 'negative'
        ? 'Actionable issue or friction reported'
        : 'General product suggestion or observation';
  return { sentiment, summary };
}

function formatFeedbackItem(f: any) {
  return {
    id: Number(f.id),
    user_id: f.user_id ? Number(f.user_id) : null,
    category: f.category,
    message: f.message,
    page_url: f.page_url,
    metadata: f.metadata ?? null,
    status: f.status,
    sentiment: f.sentiment,
    ai_analysis: f.ai_analysis ?? null,
    is_analyzed: Boolean(f.is_analyzed),
    created_at: f.created_at?.toISOString() ?? new Date().toISOString(),
    ...(f.users
      ? {
          user: {
            id: Number(f.users.id),
            name: f.users.name,
            email: f.users.email,
          },
        }
      : {}),
  };
}

/**
 * GET /api/feedback
 * - When `?page=` is provided (`useFeedback` on `/admin/feedback`): returns paginated
 *   `{ data, current_page, last_page, total }` (all rows for moderators/admins, own rows otherwise).
 * - When called without `?page=`: returns bare array for backward compatibility.
 */
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const isOperator = Boolean(req.user?.is_moderator || req.user?.role === 'admin' || req.user?.role === 'moderator');
    const hasPageParam = req.query.page !== undefined;
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = 20;

    const whereClause = isOperator && hasPageParam ? {} : { user_id: userId };

    if (hasPageParam) {
      const [rows, total] = await Promise.all([
        prisma.feedback.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
          ...(isOperator ? { include: { users: { select: { id: true, name: true, email: true } } } } : {}),
        }),
        prisma.feedback.count({ where: whereClause }),
      ]);
      return res.json({
        data: rows.map(formatFeedbackItem),
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
        total,
      });
    }

    const feedback = await prisma.feedback.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return res.json(feedback.map(formatFeedbackItem));
  } catch (error: any) {
    console.error('[Feedback] List error:', error.message);
    if (req.query.page !== undefined) {
      return res.json({ data: [], current_page: 1, last_page: 1, total: 0 });
    }
    return res.json([]);
  }
});

// POST /api/feedback — submit feedback with automatic sentiment classification
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { category, message, content, type, page_url, metadata } = req.body || {};

    const feedbackMessage = String(message || content || '').trim();
    if (!feedbackMessage) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const { sentiment, summary } = classifySentiment(feedbackMessage);
    const now = new Date();

    const feedback = await prisma.feedback.create({
      data: {
        user_id: userId,
        category: category || type || 'general',
        message: feedbackMessage,
        page_url: page_url || null,
        metadata: metadata || null,
        status: 'new',
        sentiment,
        ai_analysis: summary,
        is_analyzed: true,
        created_at: now,
        updated_at: now,
      },
    });

    return res.json({ success: true, id: Number(feedback.id), sentiment });
  } catch (error: any) {
    console.error('[Feedback] Create error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

/**
 * PUT /api/feedback/:id — update feedback triage status (`useFeedback` on `/admin/feedback`)
 */
router.put('/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const isOperator = Boolean(req.user?.is_moderator || req.user?.role === 'admin' || req.user?.role === 'moderator');
    const status = String(req.body?.status || '').trim();

    if (!['new', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(422).json({ message: 'Invalid feedback status' });
    }

    const existing = await prisma.feedback.findUnique({
      where: { id: BigInt(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Feedback item not found' });
    }
    if (!isOperator && existing.user_id !== userId) {
      return res.status(403).json({ message: 'Moderator access required to triage other users feedback' });
    }

    const updated = await prisma.feedback.update({
      where: { id: existing.id },
      data: { status, updated_at: new Date() },
    });

    return res.json({
      success: true,
      data: formatFeedbackItem(updated),
    });
  } catch (error: any) {
    console.error('[Feedback] Update error:', error.message);
    return res.status(500).json({ message: 'Failed to update feedback status' });
  }
});

export default router;
