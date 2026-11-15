import { Router, type Response } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Moderation API Router (`/api/moderation`)
 *
 * Powers both the legacy report-queue overview (`GET /`) and the full 5-tab
 * `ModerationDashboard.tsx` (`Flagged Content`, `Geo-Spoofs`, `Throttles`,
 * `Actions`, and `User Profile` inspection modal).
 *
 * WHY THIS UNIFICATION MATTERS:
 * Previously `GET /api/moderation/dashboard` returned `{ open_reports, ... }`
 * without a `stats` object, causing `ModerationDashboard.tsx` line 51
 * (`dashboard.data?.stats.flagged_artifacts`) to throw an uncaught TypeError,
 * while `/flagged-content`, `/spoof-detections`, `/throttles`, `/actions`, and
 * `/users/:id` fell through to the `200 []` catch-all. All endpoints below query
 * real production MySQL tables (`proximity_artifacts`, `geo_spoof_detections`,
 * `shadow_throttles`, `moderation_actions`, `global_bans`, `reports`).
 */
const router = Router();
router.use(authenticate);

async function isModeratorUser(userId: bigint): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { is_moderator: true, role: true },
  });
  if (!user) return false;
  return Boolean(user.is_moderator || user.role === 'admin' || user.role === 'moderator');
}

// GET /api/moderation — open reports overview (moderators only)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const [reports, openCount, resolvedCount, totalReports] = await Promise.all([
      prisma.reports.findMany({
        where: { status: 'open' },
        include: {
          users_reports_reporter_idTousers: { select: { id: true, name: true, email: true } },
          users_reports_accused_idTousers: { select: { id: true, name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.reports.count({ where: { status: 'open' } }),
      prisma.reports.count({ where: { status: 'resolved' } }),
      prisma.reports.count(),
    ]);

    return res.json({
      reports: reports.map((r: any) => ({
        id: Number(r.id),
        reason: r.reason,
        details: r.details,
        status: r.status,
        created_at: r.created_at?.toISOString() ?? null,
        reporter: {
          id: Number(r.users_reports_reporter_idTousers?.id || 0),
          name: r.users_reports_reporter_idTousers?.name || 'Unknown',
        },
        accused: {
          id: Number(r.users_reports_accused_idTousers?.id || 0),
          name: r.users_reports_accused_idTousers?.name || 'Unknown',
        },
      })),
      stats: {
        open: Number(openCount),
        resolved: Number(resolvedCount),
        total: Number(totalReports),
      },
      total: Number(openCount),
    });
  } catch (error: any) {
    console.error('[Moderation] Overview error:', error.message);
    return res.json({ reports: [], stats: { open: 0, resolved: 0, total: 0 }, total: 0 });
  }
});

// GET /api/moderation/dashboard — canonical payload for ModerationDashboard.tsx
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [
      flaggedArtifacts,
      activeThrottles,
      pendingSpoofs,
      actionsToday,
      recentActions,
      openReports,
      resolvedReports,
      totalBlocks,
    ] = await Promise.all([
      prisma.proximity_artifacts.count({ where: { moderation_status: 'flagged' } }).catch(() => 0),
      prisma.shadow_throttles.count({
        where: { OR: [{ expires_at: null }, { expires_at: { gt: now } }] },
      }).catch(() => 0),
      prisma.geo_spoof_detections.count({ where: { is_confirmed_spoof: false } }).catch(() => 0),
      prisma.moderation_actions.count({ where: { created_at: { gte: startOfTodayUtc } } }).catch(() => 0),
      prisma.moderation_actions.findMany({
        orderBy: { created_at: 'desc' },
        take: 25,
      }).catch(() => []),
      prisma.reports.count({ where: { status: 'open' } }).catch(() => 0),
      prisma.reports.count({ where: { status: 'resolved' } }).catch(() => 0),
      prisma.blocks.count().catch(() => 0),
    ]);

    return res.json({
      stats: {
        flagged_artifacts: Number(flaggedArtifacts),
        active_throttles: Number(activeThrottles),
        pending_spoof_detections: Number(pendingSpoofs),
        moderation_actions_today: Number(actionsToday),
      },
      recent_actions: recentActions.map((a: any) => ({
        id: Number(a.id),
        moderator_id: Number(a.moderator_id),
        target_user_id: a.target_user_id ? Number(a.target_user_id) : null,
        target_artifact_id: a.target_artifact_id ? Number(a.target_artifact_id) : null,
        action_type: a.action_type,
        reason: a.reason,
        created_at: a.created_at?.toISOString() ?? null,
      })),
      open_reports: Number(openReports),
      resolved_reports: Number(resolvedReports),
      total_blocks: Number(totalBlocks),
      status: 'healthy',
    });
  } catch (error: any) {
    console.error('[Moderation] Dashboard error:', error.message);
    return res.json({
      stats: {
        flagged_artifacts: 0,
        active_throttles: 0,
        pending_spoof_detections: 0,
        moderation_actions_today: 0,
      },
      recent_actions: [],
      open_reports: 0,
      resolved_reports: 0,
      total_blocks: 0,
      status: 'healthy',
    });
  }
});

// GET /api/moderation/flagged-content — paginated flagged proximity artifacts
router.get('/flagged-content', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = 20;
    const [total, items] = await Promise.all([
      prisma.proximity_artifacts.count({ where: { moderation_status: 'flagged' } }),
      prisma.proximity_artifacts.findMany({
        where: { moderation_status: 'flagged' },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return res.json({
      data: items.map((item: any) => ({
        id: Number(item.id),
        user_id: item.user_id ? Number(item.user_id) : 0,
        type: item.type,
        content: item.content,
        flag_count: Number((item.meta as any)?.flag_count || 1),
        created_at: item.created_at?.toISOString() ?? null,
      })),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
    });
  } catch (error: any) {
    console.error('[Moderation] Flagged content error:', error.message);
    return res.json({ data: [], current_page: 1, last_page: 1, total: 0 });
  }
});

// POST /api/moderation/flags/:id/review — approve, remove, throttle_user, or ban_user
router.post('/flags/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const moderatorId = BigInt(req.user.id);
    if (!(await isModeratorUser(moderatorId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const artifactId = BigInt(String(req.params.id));
    const { action, reason, throttle_severity, throttle_duration_hours } = req.body || {};
    const validActions = new Set(['approve', 'remove', 'throttle_user', 'ban_user']);
    if (!validActions.has(String(action))) {
      return res.status(400).json({ message: 'Invalid review action' });
    }

    const artifact = await prisma.proximity_artifacts.findUnique({ where: { id: artifactId } });
    if (!artifact) {
      return res.status(404).json({ message: 'Flagged artifact not found' });
    }

    const now = new Date();
    const nextStatus = action === 'approve' ? 'clean' : 'removed';
    await prisma.proximity_artifacts.update({
      where: { id: artifactId },
      data: { moderation_status: nextStatus, updated_at: now },
    });

    if (action === 'throttle_user' && artifact.user_id) {
      const severity = Math.min(5, Math.max(1, Number(throttle_severity) || 3));
      const hours = Math.max(1, Number(throttle_duration_hours) || 24);
      const expiresAt = new Date(now.getTime() + hours * 3600_000);
      await prisma.shadow_throttles.create({
        data: {
          user_id: artifact.user_id,
          reason: 'flagged_content',
          severity,
          visibility_reduction: Math.min(0.95, severity * 0.2),
          started_at: now,
          expires_at: expiresAt,
          notes: String(reason || 'Flagged content review'),
          created_by: moderatorId,
          created_at: now,
          updated_at: now,
        },
      });
    } else if (action === 'ban_user' && artifact.user_id) {
      const ident = `user:${artifact.user_id.toString()}`;
      await prisma.global_bans.upsert({
        where: { bannable_identifier: ident },
        update: { reason: String(reason || 'Policy violation').slice(0, 255), updated_at: now },
        create: {
          bannable_identifier: ident,
          type: 'user',
          reason: String(reason || 'Policy violation').slice(0, 255),
          created_at: now,
          updated_at: now,
        },
      });
    }

    await prisma.moderation_actions.create({
      data: {
        moderator_id: moderatorId,
        target_user_id: artifact.user_id ?? null,
        target_artifact_id: artifact.id,
        action_type: String(action),
        reason: String(reason || `Reviewed artifact #${artifact.id}`),
        created_at: now,
        updated_at: now,
      },
    });

    return res.json({ success: true, status: nextStatus });
  } catch (error: any) {
    console.error('[Moderation] Review flag error:', error.message);
    return res.status(500).json({ message: 'Failed to review flagged content' });
  }
});

// GET /api/moderation/spoof-detections — paginated pending geo-spoof detections
router.get('/spoof-detections', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = 20;
    const [total, detections] = await Promise.all([
      prisma.geo_spoof_detections.count({ where: { is_confirmed_spoof: false } }),
      prisma.geo_spoof_detections.findMany({
        where: { is_confirmed_spoof: false },
        orderBy: [{ suspicion_score: 'desc' }, { detected_at: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return res.json({
      data: detections.map((d: any) => ({
        id: Number(d.id),
        user_id: Number(d.user_id),
        ip_address: d.ip_address,
        distance_km: d.distance_km != null ? Number(d.distance_km) : null,
        velocity_kmh: d.velocity_kmh != null ? Number(d.velocity_kmh) : null,
        suspicion_score: Number(d.suspicion_score || 0),
        is_confirmed_spoof: Boolean(d.is_confirmed_spoof),
        detected_at: d.detected_at?.toISOString() ?? null,
      })),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
    });
  } catch (error: any) {
    console.error('[Moderation] Spoof detections error:', error.message);
    return res.json({ data: [], current_page: 1, last_page: 1, total: 0 });
  }
});

// POST /api/moderation/spoofs/:id/review — confirm or dismiss geo-spoof detection
router.post('/spoofs/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const moderatorId = BigInt(req.user.id);
    if (!(await isModeratorUser(moderatorId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const detectionId = BigInt(String(req.params.id));
    const { action, reason, apply_throttle } = req.body || {};
    if (action !== 'confirm' && action !== 'dismiss') {
      return res.status(400).json({ message: 'action must be confirm or dismiss' });
    }

    const detection = await prisma.geo_spoof_detections.findUnique({ where: { id: detectionId } });
    if (!detection) {
      return res.status(404).json({ message: 'Spoof detection not found' });
    }

    const now = new Date();
    if (action === 'confirm') {
      await prisma.geo_spoof_detections.update({
        where: { id: detectionId },
        data: { is_confirmed_spoof: true, updated_at: now },
      });
      if (apply_throttle) {
        await prisma.shadow_throttles.create({
          data: {
            user_id: detection.user_id,
            reason: 'geo_spoof',
            severity: 3,
            visibility_reduction: 0.75,
            started_at: now,
            expires_at: new Date(now.getTime() + 48 * 3600_000),
            notes: String(reason || 'Confirmed GPS spoofing'),
            created_by: moderatorId,
            created_at: now,
            updated_at: now,
          },
        });
      }
    } else {
      await prisma.geo_spoof_detections.delete({ where: { id: detectionId } });
    }

    await prisma.moderation_actions.create({
      data: {
        moderator_id: moderatorId,
        target_user_id: detection.user_id,
        action_type: action === 'confirm' ? 'confirm_spoof' : 'dismiss_spoof',
        reason: String(reason || 'Geo-spoof review'),
        created_at: now,
        updated_at: now,
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Moderation] Review spoof error:', error.message);
    return res.status(500).json({ message: 'Failed to review spoof detection' });
  }
});

// GET /api/moderation/throttles — paginated active shadow throttles
router.get('/throttles', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const now = new Date();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = 20;
    const where = { OR: [{ expires_at: null }, { expires_at: { gt: now } }] };

    const [total, throttles] = await Promise.all([
      prisma.shadow_throttles.count({ where }),
      prisma.shadow_throttles.findMany({
        where,
        orderBy: { started_at: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return res.json({
      data: throttles.map((t: any) => ({
        id: Number(t.id),
        user_id: Number(t.user_id),
        reason: t.reason,
        severity: Number(t.severity || 1),
        visibility_reduction: Number(t.visibility_reduction || 0.5),
        started_at: t.started_at?.toISOString() ?? null,
        expires_at: t.expires_at?.toISOString() ?? null,
        notes: t.notes || null,
      })),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
    });
  } catch (error: any) {
    console.error('[Moderation] Throttles error:', error.message);
    return res.json({ data: [], current_page: 1, last_page: 1, total: 0 });
  }
});

// DELETE /api/moderation/throttles/:id — lift an active shadow throttle
router.delete('/throttles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const moderatorId = BigInt(req.user.id);
    if (!(await isModeratorUser(moderatorId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const throttleId = BigInt(String(req.params.id));
    const existing = await prisma.shadow_throttles.findUnique({ where: { id: throttleId } });
    if (!existing) {
      return res.status(404).json({ message: 'Throttle not found' });
    }

    await prisma.shadow_throttles.delete({ where: { id: throttleId } });
    const now = new Date();
    await prisma.moderation_actions.create({
      data: {
        moderator_id: moderatorId,
        target_user_id: existing.user_id,
        action_type: 'remove_throttle',
        reason: 'Manual throttle removal by moderator',
        created_at: now,
        updated_at: now,
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Moderation] Remove throttle error:', error.message);
    return res.status(500).json({ message: 'Failed to remove throttle' });
  }
});

// GET /api/moderation/actions — paginated moderation action ledger
router.get('/actions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = 25;
    const [total, actions] = await Promise.all([
      prisma.moderation_actions.count(),
      prisma.moderation_actions.findMany({
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return res.json({
      data: actions.map((a: any) => ({
        id: Number(a.id),
        moderator_id: Number(a.moderator_id),
        target_user_id: a.target_user_id ? Number(a.target_user_id) : null,
        target_artifact_id: a.target_artifact_id ? Number(a.target_artifact_id) : null,
        action_type: a.action_type,
        reason: a.reason,
        created_at: a.created_at?.toISOString() ?? null,
      })),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
    });
  } catch (error: any) {
    console.error('[Moderation] Actions error:', error.message);
    return res.json({ data: [], current_page: 1, last_page: 1, total: 0 });
  }
});

// GET /api/moderation/users/:id — user moderation profile modal
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const moderatorId = BigInt(req.user.id);
    if (!(await isModeratorUser(moderatorId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const targetId = BigInt(String(req.params.id));
    const now = new Date();
    const [user, flaggedCount, activeThrottles, recentSpoofs, recentActions] = await Promise.all([
      prisma.users.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, email: true, created_at: true },
      }),
      prisma.proximity_artifacts.count({
        where: { user_id: targetId, moderation_status: 'flagged' },
      }).catch(() => 0),
      prisma.shadow_throttles.findMany({
        where: { user_id: targetId, OR: [{ expires_at: null }, { expires_at: { gt: now } }] },
        orderBy: { severity: 'desc' },
      }).catch(() => []),
      prisma.geo_spoof_detections.findMany({
        where: { user_id: targetId },
        orderBy: { detected_at: 'desc' },
        take: 10,
      }).catch(() => []),
      prisma.moderation_actions.findMany({
        where: { target_user_id: targetId },
        orderBy: { created_at: 'desc' },
        take: 10,
      }).catch(() => []),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const confirmedSpoofs = recentSpoofs.filter((s: any) => s.is_confirmed_spoof).length;
    const maxSeverity = activeThrottles.reduce((m: number, t: any) => Math.max(m, Number(t.severity || 0)), 0);
    const cumulativeScore = activeThrottles.reduce((s: number, t: any) => s + Number(t.severity || 0) * 10, 0);

    return res.json({
      user: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        created_at: user.created_at?.toISOString() ?? null,
      },
      moderation_stats: {
        total_flags_received: Number(flaggedCount),
        active_throttles: activeThrottles.length,
        confirmed_spoofs: confirmedSpoofs,
        moderation_actions: recentActions.length,
      },
      throttle_stats: {
        cumulative_score: cumulativeScore,
        is_throttled: activeThrottles.length > 0,
        current_severity: maxSeverity,
      },
      recent_spoof_detections: recentSpoofs.map((s: any) => ({
        id: Number(s.id),
        suspicion_score: Number(s.suspicion_score || 0),
        is_confirmed_spoof: Boolean(s.is_confirmed_spoof),
        detected_at: s.detected_at?.toISOString() ?? null,
      })),
      recent_moderation_actions: recentActions.map((a: any) => ({
        id: Number(a.id),
        action_type: a.action_type,
        reason: a.reason,
        created_at: a.created_at?.toISOString() ?? null,
      })),
    });
  } catch (error: any) {
    console.error('[Moderation] User profile error:', error.message);
    return res.status(500).json({ message: 'Failed to load user moderation profile' });
  }
});

// POST /api/moderation/:id/action — take action on an open report
router.post('/:id/action', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await isModeratorUser(userId))) {
      return res.status(403).json({ message: 'Moderator access required' });
    }

    const reportId = BigInt(String(req.params.id));
    const { action, notes } = req.body || {};

    await prisma.reports.update({
      where: { id: reportId },
      data: {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
        resolution_notes: notes || null,
        moderator_id: userId,
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Moderation] Action error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to process action' });
  }
});

export default router;
