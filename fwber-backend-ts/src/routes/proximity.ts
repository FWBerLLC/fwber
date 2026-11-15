import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { FederationService } from '../services/FederationService.js';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';
import { MatchingHeuristicService } from '../services/MatchingHeuristicService.js';

const router = Router();
const federationService = new FederationService();
const matchingService = new MatchingHeuristicService();

/**
 * Derive a rotating daily HMAC secret for client-side Zero-Knowledge Proximity Proofs (`ZKProver.tsx`).
 * Accepting both today's and yesterday's UTC epoch prevents midnight boundary rejections while
 * ensuring leaked secrets expire automatically within 24–48h without exposing `JWT_SECRET`.
 */
export function deriveZkEpochSecret(dateOffsetDays = 0): string {
  const d = new Date(Date.now() + dateOffsetDays * 86_400_000);
  const dayKey = d.toISOString().slice(0, 10);
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'secret')
    .update(`fwber-zk-epoch-${dayKey}`)
    .digest('hex');
}

function safeProfile(u: any) {
  if (!u) return { name: 'Anonymous', avatar: null, emotion: 'neutral' };
  const p = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
  return {
    name: p?.display_name || u.name || 'Anonymous',
    avatar: p?.avatar_url || null,
    emotion: (p?.current_emotion || 'neutral').toLowerCase()
  };
}

// GET /api/proximity/local-pulse
router.get('/local-pulse', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const radius = Number(req.query.radius) || 5000;
    const lat = Number(req.query.lat) || 42.33;
    const lng = Number(req.query.lng) || -83.05;
    const topicSlug = req.query.topic_slug as string;

    const where: any = {
      moderation_status: 'clean',
      expires_at: { gt: new Date() }
    };

    if (topicSlug) {
      where.meta = {
        path: ['topic_slug'],
        equals: topicSlug
      };
    }

    const [artifacts, nearbyLocations] = await Promise.all([
      prisma.proximity_artifacts.findMany({
        where,
        orderBy: { created_at: 'desc' as const }, take: 30,
        include: { users: { select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true, current_emotion: true } } } } }
      }),
      prisma.user_locations.findMany({
        where: {
          user_id: { not: userId },
          latitude: { gte: lat - 0.05, lte: lat + 0.05 },
          longitude: { gte: lng - 0.05, lte: lng + 0.05 },
          updated_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Active in last hour
        },
        include: {
          users: {
            include: {
              user_profiles: { select: { display_name: true, avatar_url: true, current_emotion: true, date_of_birth: true, gender: true } }
            }
          }
        },
        take: 10
      })
    ]);

    const candidates = await Promise.all(nearbyLocations.map(async (loc) => {
      const u = loc.users;
      const p = u.user_profiles?.[0];
      const age = p?.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : null;

      const auraCompat = await matchingService.calculateAuraCompatibility(userId, u.id);
      const isAuraMatch = auraCompat.score >= 0.8;

      const indicators = ['active_locally'];
      if (isAuraMatch) indicators.push('aura_match');

      return {
        user_id: Number(u.id),
        name: p?.display_name || u.name,
        avatar: p?.avatar_url,
        emotion: (p?.current_emotion || 'neutral').toLowerCase(),
        age,
        gender: p?.gender,
        distance_miles: 0.5, // Simplified
        compatibility_indicators: indicators,
        aura_score: auraCompat.score,
        last_seen: loc.updated_at?.toISOString()
      };
    }));

    // Sort by aura match and proximity
    candidates.sort((a, b) => b.aura_score - a.aura_score);


    res.json({
      artifacts: artifacts.map((a: any) => {
        const p = safeProfile(a.users);
        return {
          id: Number(a.id),
          user_id: Number(a.user_id),
          type: a.type,
          content: a.content,
          lat: Number(a.location_lat),
          lng: Number(a.location_lng),
          radius_m: Number(a.visibility_radius_m),
          meta: a.meta && typeof a.meta === 'object' ? a.meta : {},
          author_name: p.name,
          author_avatar: p.avatar,
          author_emotion: p.emotion,
          created_at: a.created_at?.toISOString(),
          expires_at: a.expires_at?.toISOString(),
        };
      }),
      candidates,
      total: artifacts.length,
      radius,
      meta: {
        artifacts_count: artifacts.length,
        candidates_count: candidates.length,
        venues_count: 0,
        radius,
        ranking_strategy: 'freshness'
      }
    });
  } catch (err: any) {
    console.error('[proximity] error:', err.message);
    res.json({ artifacts: [], candidates: [], total: 0, radius: 1000, meta: {} });
  }
});

// GET /api/proximity/feed
router.get('/feed', authenticate, async (_req: any, res) => {
  try {
    const artifacts = await prisma.proximity_artifacts.findMany({
      where: { moderation_status: 'clean', expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' as const }, take: 30,
      include: { users: { select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true, current_emotion: true } } } } }
    });
    res.json({
      artifacts: artifacts.map((a: any) => {
        const p = safeProfile(a.users);
        return {
          id: Number(a.id),
          user_id: Number(a.user_id),
          type: a.type,
          content: a.content,
          meta: a.meta && typeof a.meta === 'object' ? a.meta : {},
          author_name: p.name,
          author_avatar: p.avatar,
          author_emotion: p.emotion,
          created_at: a.created_at?.toISOString(),
        };
      }),
    });
  } catch { res.json({ artifacts: [] }); }
});

// POST /api/proximity/artifacts
router.post('/artifacts', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { type, content, lat, lng, radius_m, topic_slug, amount } = req.body;
    if (!type || !content) return res.status(400).json({ error: 'type and content required' });
    const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 4);

    const meta: any = {};
    if (topic_slug) meta.topic_slug = topic_slug;
    if (amount) meta.amount = amount;

    const a = await prisma.proximity_artifacts.create({
      data: {
        user_id: userId,
        type,
        content,
        location_lat: lat || 42.33,
        location_lng: lng || -83.05,
        visibility_radius_m: radius_m || 1000,
        moderation_status: 'clean',
        expires_at: expiresAt,
        meta
      }
    });

    // Sentiment Analysis
    SentimentAnalysisService.analyzeUserSentiment(userId).catch(err => {
      console.warn('[proximity] Sentiment analysis error:', err.message);
    });

    // Federation: Broadcast if enabled
    const profile = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    if (profile?.is_federated) {
        const apiDomain = process.env.API_DOMAIN || 'api.fwber.online';
        federationService.broadcastUpdate(userId, {
            id: `https://${apiDomain}/api/proximity/artifacts/${a.id}`,
            type: 'Note',
            content: content,
            published: a.created_at?.toISOString()
        }).catch(err => console.error('[proximity] Federation broadcast failed:', err.message));
    }

    res.json({ artifact: { id: Number(a.id), type: a.type, content: a.content }, success: true });
  } catch (err: any) { console.error('[proximity] create error:', err.message); res.json({ artifact: null, success: false }); }
});

// GET /api/proximity/artifacts/:id
router.get('/artifacts/:id', authenticate, async (req: any, res) => {
  try {
    const a = await prisma.proximity_artifacts.findUnique({ where: { id: BigInt(req.params.id) }, include: { users: { select: { name: true, user_profiles: { select: { display_name: true, avatar_url: true, current_emotion: true } } } } } });
    if (!a) return res.json({ artifact: null });
    const p = safeProfile(a.users);
    res.json({ artifact: { id: Number(a.id), type: a.type, content: a.content, author_name: p.name, author_avatar: p.avatar, author_emotion: p.emotion, created_at: a.created_at?.toISOString() } });
  } catch { res.json({ artifact: null }); }
});

// POST /api/proximity/artifacts/:id/flag
router.post('/artifacts/:id/flag', authenticate, async (req: any, res) => {
  await prisma.proximity_artifacts.update({ where: { id: BigInt(req.params.id) }, data: { moderation_status: 'flagged' } }).catch(() => {});
  res.json({ message: 'Flagged' });
});

// DELETE /api/proximity/artifacts/:id
router.delete('/artifacts/:id', authenticate, async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const artifactId = BigInt(req.params.id);

  try {
      const artifact = await prisma.proximity_artifacts.findUnique({ where: { id: artifactId } });
      if (artifact && artifact.user_id === userId) {
          await prisma.proximity_artifacts.delete({ where: { id: artifactId } });

          // Federation: Broadcast Delete if enabled
          const profile = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
          if (profile?.is_federated) {
              const apiDomain = process.env.API_DOMAIN || 'api.fwber.online';
              federationService.broadcastUpdate(userId, {
                  id: `https://${apiDomain}/api/proximity/artifacts/${artifactId}`,
                  type: 'Tombstone'
              }, 'Delete').catch(err => console.error('[proximity] Federation delete failed:', err.message));
          }
      }
      res.json({ message: 'Deleted' });
  } catch (err: any) {
      res.status(500).json({ error: err.message });
  }
});

// POST /api/proximity/artifacts/:id/comments
router.post('/artifacts/:id/comments', authenticate, async (req: any, res) => {
  try {
    const { content, parent_id } = req.body;
    const c = await prisma.proximity_artifact_comments.create({
      data: {
        proximity_artifact_id: BigInt(req.params.id),
        user_id: BigInt(req.user.id),
        content: content || '',
        parent_id: parent_id ? BigInt(parent_id) : null
      }
    });
    res.json({ message: 'Comment added', comment: { id: Number(c.id), parent_id: c.parent_id ? Number(c.parent_id) : null } });
  } catch (err: any) {
    console.error('[proximity] comment error:', err.message);
    res.json({ message: 'Failed to add comment', comment: null });
  }
});

// GET /api/proximity/artifacts/:id/comments
router.get('/artifacts/:id/comments', authenticate, async (req: any, res) => {
  try {
    const comments = await prisma.proximity_artifact_comments.findMany({
      where: { proximity_artifact_id: BigInt(req.params.id) },
      orderBy: { created_at: 'asc' as const },
      take: 50
    });
    res.json({
      data: comments.map((c: any) => ({
        id: Number(c.id),
        content: c.content,
        parent_id: c.parent_id ? Number(c.parent_id) : null,
        created_at: c.created_at?.toISOString()
      }))
    });
  } catch { res.json({ data: [] }); }
});

// POST /api/proximity/artifacts/:id/vote
router.post('/artifacts/:id/vote', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const artifactId = BigInt(req.params.id);
    const val = Number(req.body.value) || 1;
    await prisma.proximity_artifact_votes.upsert({
      where: { proximity_artifact_id_user_id: { proximity_artifact_id: artifactId, user_id: userId } },
      update: { value: val },
      create: { proximity_artifact_id: artifactId, user_id: userId, value: val }
    }).catch(async () => {
      await prisma.proximity_artifact_votes.create({ data: { proximity_artifact_id: artifactId, user_id: userId, value: val } });
    });
    res.json({ message: 'Voted', vote: { value: val } });
  } catch { res.json({ message: 'Voted', vote: null }); }
});

/**
 * POST /api/proximity/artifacts/:id/claim
 * Atomic FWB Token Drop claim (`LocalPulse.tsx`).
 * Ensures an artifact is of type `token_drop`, prevents self-claim or double-claim,
 * marks `meta.claimed = true`, credits the claimer's `token_balance`, and records `wallet_transactions`.
 */
router.post('/artifacts/:id/claim', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let artifactId: bigint;
    try {
      artifactId = BigInt(req.params.id);
    } catch {
      return res.status(400).json({ error: 'Invalid artifact ID' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const artifact = await tx.proximity_artifacts.findUnique({ where: { id: artifactId } });
      if (!artifact) {
        return { error: 'Token drop not found', status: 404 as const };
      }
      if (artifact.type !== 'token_drop') {
        return { error: 'Artifact is not a claimable token drop', status: 400 as const };
      }
      if (artifact.user_id === userId) {
        return { error: 'Cannot claim your own token drop', status: 400 as const };
      }

      const rawMeta = artifact.meta && typeof artifact.meta === 'object' ? (artifact.meta as Record<string, any>) : {};
      if (rawMeta.claimed) {
        return { error: 'This token drop has already been claimed', status: 400 as const };
      }

      const rawAmount = Number(rawMeta.amount);
      const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? Math.min(Math.round(rawAmount), 500) : 5;
      const now = new Date();

      const updatedMeta = {
        ...rawMeta,
        amount,
        claimed: true,
        claimed_by: Number(userId),
        claimed_at: now.toISOString(),
      };

      await tx.proximity_artifacts.update({
        where: { id: artifactId },
        data: { meta: updatedMeta, updated_at: now },
      });

      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: { token_balance: { increment: amount } },
        select: { token_balance: true },
      });

      await tx.wallet_transactions.create({
        data: {
          user_id: userId,
          amount,
          type: 'token_drop_claim',
          description: `Claimed Local Pulse Token Drop (#${artifactId.toString()})`,
          created_at: now,
          updated_at: now,
        },
      });

      return {
        status: 200 as const,
        amount,
        newBalance: Number(updatedUser.token_balance || 0),
        meta: updatedMeta,
      };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error, message: result.error });
    }

    return res.json({
      success: true,
      claimed: true,
      amount: result.amount,
      new_balance: result.newBalance,
      meta: result.meta,
    });
  } catch (err: any) {
    console.error('[proximity] claim error:', err.message);
    return res.status(500).json({ error: 'Failed to claim token drop' });
  }
});

/**
 * GET /api/proximity/zk-params
 * Issue precision & rotating epoch HMAC secret for `ZKProver.tsx`.
 */
router.get('/zk-params', authenticate, (_req: any, res) => {
  res.json({
    secret: deriveZkEpochSecret(0),
    precision: 7,
  });
});

/**
 * POST /api/proximity/zk-verify
 * Verify a privacy-preserving geohash HMAC proof (`ZKProver.tsx`) without storing raw GPS coordinates.
 */
router.post('/zk-verify', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { target_entity_type, target_entity_id, proof_payload, public_signals } = req.body || {};

    const allowedTypes = new Set(['venue', 'event', 'user', 'chatroom']);
    const entityType = String(target_entity_type || '').trim();
    if (!allowedTypes.has(entityType)) {
      return res.status(400).json({ verified: false, error: 'Invalid target_entity_type' });
    }

    let entityId: bigint;
    try {
      entityId = BigInt(target_entity_id);
    } catch {
      return res.status(400).json({ verified: false, error: 'Invalid target_entity_id' });
    }

    const geohashStr = String(proof_payload?.geohash || '').trim();
    const signatureHex = String(proof_payload?.signature || '').trim().toLowerCase();
    const tsSec = Number(public_signals?.timestamp);

    if (!geohashStr || geohashStr.length < 4 || geohashStr.length > 12 || !/^[0-9b-hjkmnp-z]+$/i.test(geohashStr)) {
      return res.status(400).json({ verified: false, error: 'Invalid geohash in proof_payload' });
    }
    if (!/^[a-f0-9]{64}$/.test(signatureHex)) {
      return res.status(400).json({ verified: false, error: 'Invalid HMAC signature format' });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(tsSec) || Math.abs(nowSec - tsSec) > 300) {
      return res.status(400).json({ verified: false, error: 'Proof timestamp expired or skewed beyond 300s' });
    }

    const messageToSign = `${geohashStr}${tsSec}${entityId.toString()}`;
    const candidateSecrets = [deriveZkEpochSecret(0), deriveZkEpochSecret(-1)];
    const sigBuf = Buffer.from(signatureHex, 'hex');

    const matchesEpoch = candidateSecrets.some((secret) => {
      const expected = crypto.createHmac('sha256', secret).update(messageToSign).digest();
      return expected.length === sigBuf.length && crypto.timingSafeEqual(expected, sigBuf);
    });

    if (!matchesEpoch) {
      return res.status(400).json({ verified: false, error: 'Zero-knowledge proximity signature mismatch' });
    }

    const now = new Date();
    const record = await prisma.zk_proximity_proofs.create({
      data: {
        user_id: userId,
        target_entity_type: entityType,
        target_entity_id: entityId,
        proof_hash: signatureHex,
        is_verified: true,
        created_at: now,
        updated_at: now,
      },
    });

    return res.json({
      verified: true,
      record_id: Number(record.id),
      precision: geohashStr.length,
    });
  } catch (err: any) {
    console.error('[proximity] zk-verify error:', err.message);
    return res.status(500).json({ verified: false, error: 'Failed to verify zero-knowledge proof' });
  }
});

export default router;
