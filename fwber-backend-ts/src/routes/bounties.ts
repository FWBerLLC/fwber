import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Matchmaker Bounties & Public Matchmaker Landing Router
 *
 * Mounted at:
 * - `/api/bounties` (`default` export)
 * - `/api/matchmaker` (`matchmakerRouter` export — public `/bounty/:slug` lookup)
 *
 * Fixes unified in `v2.3.90`:
 * 1. `CreateBountyModal.tsx` posts `{ token_reward }` without `title`, expects
 *    `{ share_url }`, and checks `err.status === 402` on insufficient tokens.
 * 2. `app/bounties/page.tsx` expected `{ bounties }` + `rewardTokens` + `author`
 *    while legacy callers expected `{ data }` + `reward_amount` + `creator`.
 * 3. `app/bounty/[slug]/page.tsx` (shareable viral matchmaker page) calls public
 *    `GET /api/matchmaker/bounty/:slug` before login and authenticated
 *    `POST /api/bounties/:slug/suggest` (`prisma.match_assists`) after login.
 */
const router = Router();
export const matchmakerRouter = Router();

function getFrontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'https://fwber.online').replace(/\/+$/, '');
}

function tryExtractViewerId(req: Request): bigint | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as { id?: string | number };
    if (decoded?.id !== undefined && decoded?.id !== null) {
      return BigInt(decoded.id);
    }
  } catch {
    // Allow public read access when token is absent or expired
  }
  return null;
}

function computeAge(dob: Date | null | undefined): number {
  if (!dob) return 25;
  const diff = Date.now() - dob.getTime();
  const years = Math.floor(diff / (365.25 * 86400 * 1000));
  return years >= 18 && years <= 120 ? years : 25;
}

function normalizePhotoUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('/')) {
    return filePath;
  }
  return `/uploads/${filePath}`;
}

async function resolveBountyBySlugOrId(slugOrId: string) {
  const trimmed = String(slugOrId || '').trim();
  if (!trimmed) return null;

  const bySlug = await prisma.match_bounties.findUnique({
    where: { slug: trimmed },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          user_profiles: {
            select: {
              display_name: true,
              avatar_url: true,
              date_of_birth: true,
              birthdate: true,
              bio: true,
              gender: true,
            },
          },
          photos: {
            where: { is_private: false },
            orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
            take: 6,
            select: { id: true, file_path: true, is_primary: true },
          },
        },
      },
      _count: { select: { match_assists: true } },
    },
  });

  if (bySlug && !bySlug.deleted_at) return bySlug;

  if (/^\d+$/.test(trimmed)) {
    const byId = await prisma.match_bounties.findUnique({
      where: { id: BigInt(trimmed) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            user_profiles: {
              select: {
                display_name: true,
                avatar_url: true,
                date_of_birth: true,
                birthdate: true,
                bio: true,
                gender: true,
              },
            },
            photos: {
              where: { is_private: false },
              orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
              take: 6,
              select: { id: true, file_path: true, is_primary: true },
            },
          },
        },
        _count: { select: { match_assists: true } },
      },
    });
    if (byId && !byId.deleted_at) return byId;
  }

  return null;
}

function formatPublicBountyDetail(bounty: any) {
  const profile = Array.isArray(bounty.users?.user_profiles)
    ? bounty.users.user_profiles[0]
    : bounty.users?.user_profiles;
  const photos = Array.isArray(bounty.users?.photos)
    ? bounty.users.photos.map((p: any) => ({
        id: Number(p.id),
        url: normalizePhotoUrl(p.file_path),
        is_primary: Boolean(p.is_primary),
      }))
    : [];
  const primaryPhoto = photos.find((p: any) => p.is_primary) || photos[0];
  const displayName = profile?.display_name || bounty.users?.name || 'FWBer Member';
  const avatarUrl = profile?.avatar_url || primaryPhoto?.url || '';
  const shareUrl = `${getFrontendBaseUrl()}/bounty/${bounty.slug}`;

  return {
    id: Number(bounty.id),
    slug: bounty.slug,
    title: bounty.description ? bounty.description.slice(0, 64) : `${displayName}'s Match Bounty`,
    description: bounty.description || `Help introduce a great match for ${displayName} and earn ${Number(bounty.token_reward)} FWB tokens!`,
    token_reward: Number(bounty.token_reward),
    reward_amount: Number(bounty.token_reward),
    rewardTokens: Number(bounty.token_reward),
    status: bounty.status,
    share_url: shareUrl,
    assist_count: Number(bounty._count?.match_assists ?? 0),
    expires_at: bounty.expires_at instanceof Date ? bounty.expires_at.toISOString() : bounty.expires_at,
    created_at: bounty.created_at instanceof Date ? bounty.created_at.toISOString() : bounty.created_at,
    user: {
      id: Number(bounty.users?.id),
      name: displayName,
      avatar_url: avatarUrl,
      profile: {
        display_name: displayName,
        age: computeAge(profile?.date_of_birth || profile?.birthdate),
        bio: profile?.bio || bounty.description || 'Open to introductions from trusted friends.',
        gender: profile?.gender || 'Unspecified',
      },
      photos,
    },
    creator: {
      id: Number(bounty.users?.id),
      name: displayName,
      avatar_url: avatarUrl || null,
    },
    author: displayName,
  };
}

// Public GET /api/matchmaker/bounty/:slug — Shareable bounty landing page
matchmakerRouter.get('/bounty/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '');
    const bounty = await resolveBountyBySlugOrId(slug);
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found', message: 'Bounty not found' });
    }
    return res.json({ bounty: formatPublicBountyDetail(bounty) });
  } catch (err: any) {
    console.error('[matchmaker] GET bounty error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to load bounty' });
  }
});

// GET /api/bounties — List active/community bounties (or viewer's own with ?mine=true)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = Math.min(Math.max(1, parseInt(String(req.query.per_page || '20'), 10) || 20), 50);
    const sort = String(req.query.sort || 'newest');
    const mineOnly = String(req.query.mine || '') === 'true';
    const viewerId = tryExtractViewerId(req);

    if (mineOnly && !viewerId) {
      return res.status(401).json({ error: 'Authentication required for personal bounties' });
    }

    const where: any = {
      deleted_at: null,
      status: { in: ['active', 'closed', 'fulfilled'] },
      ...(mineOnly && viewerId ? { user_id: viewerId } : {}),
    };

    const orderBy: any = sort === 'reward' ? { token_reward: 'desc' as const } : { created_at: 'desc' as const };

    const [bounties, total] = await Promise.all([
      prisma.match_bounties.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              user_profiles: { select: { display_name: true, avatar_url: true } },
            },
          },
          _count: { select: { match_assists: true } },
          ...(mineOnly
            ? {
                match_assists: {
                  orderBy: { created_at: 'desc' as const },
                  take: 10,
                  include: {
                    users_match_assists_matchmaker_idTousers: { select: { id: true, name: true } },
                    users_match_assists_target_idTousers: {
                      select: {
                        id: true,
                        name: true,
                        user_profiles: { select: { display_name: true, avatar_url: true } },
                      },
                    },
                  },
                },
              }
            : {}),
        },
      }),
      prisma.match_bounties.count({ where }),
    ]);

    const baseUrl = getFrontendBaseUrl();
    const data = bounties.map((b: any) => {
      const profile = Array.isArray(b.users?.user_profiles) ? b.users.user_profiles[0] : b.users?.user_profiles;
      const authorName = profile?.display_name || b.users?.name || 'Anonymous';
      const reward = Number(b.token_reward);
      const suggestions = Array.isArray(b.match_assists)
        ? b.match_assists.map((a: any) => {
            const targetUser = a.users_match_assists_target_idTousers;
            const targetProfile = Array.isArray(targetUser?.user_profiles)
              ? targetUser.user_profiles[0]
              : targetUser?.user_profiles;
            return {
              id: Number(a.id),
              status: a.status,
              created_at: a.created_at instanceof Date ? a.created_at.toISOString() : a.created_at,
              matchmaker: {
                id: Number(a.users_match_assists_matchmaker_idTousers?.id || a.matchmaker_id),
                name: a.users_match_assists_matchmaker_idTousers?.name || 'Matchmaker',
              },
              candidate: {
                id: Number(targetUser?.id || a.target_id),
                name: targetProfile?.display_name || targetUser?.name || `User #${Number(a.target_id)}`,
                avatar_url: targetProfile?.avatar_url || null,
              },
            };
          })
        : undefined;

      return {
        id: Number(b.id),
        slug: b.slug,
        title: b.description ? b.description.slice(0, 60) : `${authorName}'s Match Bounty`,
        description:
          b.description || `Introduce a great match for ${authorName} to claim ${reward} FWB tokens.`,
        reward_amount: reward,
        token_reward: reward,
        rewardTokens: reward,
        status: b.status,
        share_url: `${baseUrl}/bounty/${b.slug}`,
        assist_count: Number(b._count?.match_assists ?? 0),
        expires_at: b.expires_at instanceof Date ? b.expires_at.toISOString() : b.expires_at,
        created_at: b.created_at instanceof Date ? b.created_at.toISOString() : b.created_at,
        author: authorName,
        is_owner: viewerId ? BigInt(b.user_id) === viewerId : false,
        creator: {
          id: Number(b.users?.id),
          name: authorName,
          avatar_url: profile?.avatar_url || null,
        },
        ...(suggestions ? { suggestions } : {}),
      };
    });

    return res.json({ data, bounties: data, total, page, per_page: perPage });
  } catch (err: any) {
    console.error('[bounties] list error:', err?.message || err);
    return res.json({ data: [], bounties: [], total: 0, page: 1, per_page: 20 });
  }
});

// POST /api/bounties — Create a new Matchmaker Bounty (escrows FWB tokens)
router.post('/', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const rawReward = req.body?.token_reward ?? req.body?.reward_amount ?? 100;
    const reward = Math.floor(Number(rawReward));

    if (!Number.isFinite(reward) || reward < 10) {
      return res.status(400).json({ error: 'Minimum bounty reward is 10 FWB tokens' });
    }

    const rawTitle = String(req.body?.title || '').trim();
    const rawDescription = String(req.body?.description || '').trim();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id: userId },
        select: { id: true, name: true, token_balance: true },
      });

      const currentBalance = Number(user?.token_balance ?? 0);
      if (!user || currentBalance < reward) {
        return { insufficient: true as const, currentBalance };
      }

      const slugSeed = (rawTitle || user.name || 'match-bounty')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'match-bounty';
      const slug = `${slugSeed}-${Date.now().toString(36)}`;
      const description = rawDescription || rawTitle || '';
      const now = new Date();

      const bounty = await tx.match_bounties.create({
        data: {
          user_id: userId,
          slug,
          token_reward: reward,
          description,
          status: 'active',
          expires_at: new Date(now.getTime() + 14 * 86400000),
          created_at: now,
          updated_at: now,
        },
      });

      await tx.users.update({
        where: { id: userId },
        data: { token_balance: { decrement: reward } },
      });

      await tx.wallet_transactions.create({
        data: {
          user_id: userId,
          amount: -reward,
          type: 'bounty_escrow',
          description: `Escrowed ${reward} FWB for Match Bounty (${slug})`,
          created_at: now,
          updated_at: now,
        },
      });

      return { insufficient: false as const, bounty };
    });

    if (result.insufficient) {
      return res.status(402).json({
        error: `Insufficient FWB tokens (${result.currentBalance} available, ${reward} required)`,
      });
    }

    const shareUrl = `${getFrontendBaseUrl()}/bounty/${result.bounty.slug}`;
    return res.status(201).json({
      id: Number(result.bounty.id),
      slug: result.bounty.slug,
      reward_amount: Number(result.bounty.token_reward),
      token_reward: Number(result.bounty.token_reward),
      share_url: shareUrl,
      status: result.bounty.status,
      message: 'Bounty created',
    });
  } catch (err: any) {
    console.error('[bounties] create error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to create bounty' });
  }
});

// POST /api/bounties/:slug/suggest — Matchmaker suggests a candidate for a bounty
router.post('/:slug/suggest', authenticate, async (req: any, res: Response) => {
  try {
    const matchmakerId = BigInt(req.user.id);
    const slug = String(req.params.slug || '');
    const rawCandidateId = req.body?.candidate_id;

    if (rawCandidateId === undefined || rawCandidateId === null || !/^\d+$/.test(String(rawCandidateId))) {
      return res.status(400).json({ message: 'A valid candidate_id is required' });
    }
    const targetId = BigInt(rawCandidateId);

    const bounty = await resolveBountyBySlugOrId(slug);
    if (!bounty) {
      return res.status(404).json({ message: 'Bounty not found' });
    }
    if (bounty.status !== 'active') {
      return res.status(400).json({ message: 'This bounty is no longer accepting suggestions' });
    }

    const subjectId = BigInt(bounty.user_id);
    if (targetId === subjectId) {
      return res.status(400).json({ message: 'Cannot suggest the bounty creator to themselves' });
    }

    const candidateUser = await prisma.users.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!candidateUser) {
      return res.status(404).json({ message: 'Candidate user not found' });
    }

    // Respect bidirectional block boundaries between subject and suggested target
    const blockExists = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: subjectId, blocked_id: targetId },
          { blocker_id: targetId, blocked_id: subjectId },
        ],
      },
      select: { id: true },
    });
    if (blockExists) {
      return res.status(403).json({ message: 'This introduction is unavailable due to user privacy settings' });
    }

    const now = new Date();
    const assist = await prisma.match_assists.upsert({
      where: {
        matchmaker_id_subject_id_target_id: {
          matchmaker_id: matchmakerId,
          subject_id: subjectId,
          target_id: targetId,
        },
      },
      update: {
        match_bounty_id: bounty.id,
        status: 'suggested',
        updated_at: now,
      },
      create: {
        match_bounty_id: bounty.id,
        matchmaker_id: matchmakerId,
        subject_id: subjectId,
        target_id: targetId,
        status: 'suggested',
        created_at: now,
        updated_at: now,
      },
    });

    return res.status(201).json({
      success: true,
      assist: {
        id: Number(assist.id),
        match_bounty_id: Number(bounty.id),
        matchmaker_id: Number(matchmakerId),
        subject_id: Number(subjectId),
        target_id: Number(targetId),
        status: assist.status,
      },
    });
  } catch (err: any) {
    console.error('[bounties] suggest error:', err?.message || err);
    return res.status(500).json({ message: 'Failed to submit candidate suggestion' });
  }
});

// GET /api/bounties/:idOrSlug — Retrieve bounty detail by ID or slug
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const bounty = await resolveBountyBySlugOrId(String(req.params.idOrSlug || ''));
    if (!bounty) {
      return res.status(404).json({ message: 'Bounty not found' });
    }
    const detail = formatPublicBountyDetail(bounty);
    return res.json({ ...detail, bounty: detail });
  } catch {
    return res.status(404).json({ message: 'Bounty not found' });
  }
});

export default router;
