import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { checkAndUnlockAchievements } from '../lib/achievements.js';

/**
 * Journals / Field Notes (`/api/journals`)
 *
 * The frontend contract (lib/api/journals.ts) is:
 *   GET    /           -> { journals: JournalEntry[] }   (own entries)
 *   POST   /           -> { journal: JournalEntry }      (201)
 *   PUT    /:id        -> { journal: JournalEntry }
 *   DELETE /:id        -> { success: true }
 *
 * History: this router previously ran raw SQL against a `journal_entries`
 * table that was never created in production — every create 500'd and
 * every list silently returned []. Storage is now a real Prisma model
 * (created by tools/migrations/2026-11-17-journal-entries.sql) and this
 * router serves the exact shapes the page renders (visibility_label,
 * tags, circle_group, can_edit). Legacy `mood` / `is_private` write
 * fields are still accepted and mapped onto `visibility`.
 */
const router = Router();
router.use(authenticate);

const VISIBILITIES = ['public', 'friends', 'circle', 'private'] as const;
type Visibility = (typeof VISIBILITIES)[number];
const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: 'Public',
  friends: 'Friends',
  circle: 'Circle',
  private: 'Private',
};

function normalizeVisibility(body: any): Visibility {
  if (typeof body?.visibility === 'string' && (VISIBILITIES as readonly string[]).includes(body.visibility)) {
    return body.visibility as Visibility;
  }
  if (body?.is_private !== undefined) return body.is_private ? 'private' : 'public';
  return 'private';
}

function parseTags(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).slice(0, 12);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).slice(0, 12) : [];
    } catch { return []; }
  }
  return [];
}

async function serializeEntries(entries: any[], userId: bigint) {
  const groupIds = [...new Set(entries.map((e) => e.circle_group_id).filter(Boolean))];
  const groups = groupIds.length
    ? await prisma.groups.findMany({ where: { id: { in: groupIds } }, select: { id: true, name: true, privacy: true } })
    : [];
  const groupById = new Map(groups.map((g) => [g.id.toString(), g]));
  return entries.map((e) => {
    const visibility = (VISIBILITIES as readonly string[]).includes(e.visibility) ? e.visibility : 'private';
    const group = e.circle_group_id ? groupById.get(e.circle_group_id.toString()) : null;
    return {
      id: Number(e.id),
      user_id: Number(e.user_id),
      title: e.title ?? null,
      content: e.content,
      visibility,
      visibility_label: VISIBILITY_LABELS[visibility as Visibility],
      circle_group_id: e.circle_group_id ? Number(e.circle_group_id) : null,
      circle_group: group ? { id: Number(group.id), name: group.name, privacy: group.privacy } : null,
      tags: parseTags(e.tags),
      mood_emoji: e.mood_emoji ?? null,
      accent_color: e.accent_color ?? null,
      can_edit: e.user_id === userId,
      created_at: e.created_at?.toISOString?.() ?? e.created_at,
      updated_at: e.updated_at?.toISOString?.() ?? e.updated_at,
    };
  });
}

// GET /api/journals — list the caller's journal entries
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const visibility = typeof req.query?.visibility === 'string' ? req.query.visibility : undefined;
    const entries = await prisma.journal_entries.findMany({
      where: { user_id: userId, ...(visibility ? { visibility: visibility as Visibility } : {}) },
      orderBy: { created_at: 'desc' },
      take: 30,
    });
    res.json({ journals: await serializeEntries(entries, userId) });
  } catch (error: any) {
    console.error('[Journals] List error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list entries' });
  }
});

// POST /api/journals — create a journal entry
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { title, content, circle_group_id, tags, mood_emoji, accent_color, mood } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Content is required' });
    }

    const entry = await prisma.journal_entries.create({
      data: {
        user_id: userId,
        title: title ? String(title).slice(0, 255) : null,
        content,
        visibility: normalizeVisibility(req.body),
        circle_group_id: circle_group_id ? BigInt(circle_group_id) : null,
        tags: parseTags(tags),
        mood_emoji: mood_emoji ? String(mood_emoji).slice(0, 16) : null,
        accent_color: accent_color ? String(accent_color).slice(0, 32) : null,
        mood: mood ? String(mood).slice(0, 255) : null,
      },
    });

    // Check achievements after journal creation (dear diary)
    checkAndUnlockAchievements(userId).catch(() => {});

    const [serialized] = await serializeEntries([entry], userId);
    res.status(201).json({ journal: serialized });
  } catch (error: any) {
    console.error('[Journals] Create error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create entry' });
  }
});

// PUT /api/journals/:id — update an own journal entry
router.put('/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let entryId: bigint;
    try { entryId = BigInt(req.params.id); } catch { return res.status(400).json({ message: 'Invalid entry id' }); }

    const existing = await prisma.journal_entries.findFirst({ where: { id: entryId, user_id: userId } });
    if (!existing) return res.status(404).json({ message: 'Entry not found' });

    const { title, content, circle_group_id, tags, mood_emoji, accent_color, mood } = req.body || {};
    const entry = await prisma.journal_entries.update({
      where: { id: entryId },
      data: {
        ...(title !== undefined ? { title: title ? String(title).slice(0, 255) : null } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(req.body?.visibility !== undefined || req.body?.is_private !== undefined
          ? { visibility: normalizeVisibility(req.body) } : {}),
        ...(circle_group_id !== undefined ? { circle_group_id: circle_group_id ? BigInt(circle_group_id) : null } : {}),
        ...(tags !== undefined ? { tags: parseTags(tags) } : {}),
        ...(mood_emoji !== undefined ? { mood_emoji: mood_emoji ? String(mood_emoji).slice(0, 16) : null } : {}),
        ...(accent_color !== undefined ? { accent_color: accent_color ? String(accent_color).slice(0, 32) : null } : {}),
        ...(mood !== undefined ? { mood: mood ? String(mood).slice(0, 255) : null } : {}),
      },
    });

    const [serialized] = await serializeEntries([entry], userId);
    res.json({ journal: serialized });
  } catch (error: any) {
    console.error('[Journals] Update error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update entry' });
  }
});

// DELETE /api/journals/:id — delete an own journal entry
router.delete('/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let entryId: bigint;
    try { entryId = BigInt(req.params.id); } catch { return res.status(400).json({ message: 'Invalid entry id' }); }

    const existing = await prisma.journal_entries.findFirst({ where: { id: entryId, user_id: userId } });
    if (!existing) return res.status(404).json({ message: 'Entry not found' });

    await prisma.journal_entries.delete({ where: { id: entryId } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Journals] Delete error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
});

export default router;
