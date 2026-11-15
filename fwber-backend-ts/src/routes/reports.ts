import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

function formatReport(r: any) {
  const createdIso = r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at;
  const updatedIso = r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at;
  return {
    id: Number(r.id),
    accused_user_id: Number(r.accused_id),
    accused_name: r.users_reports_accused_idTousers?.name || 'Unknown',
    reason: r.reason,
    details: r.details || null,
    status: r.status || 'open',
    resolution_notes: r.resolution_notes || null,
    message_id: r.message_id ? Number(r.message_id) : null,
    created_at: createdIso,
    createdAt: createdIso,
    updated_at: updatedIso,
  };
}

// GET /api/reports — List moderation reports submitted by the authenticated user
router.get('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const reports = await prisma.reports.findMany({
      where: { reporter_id: userId },
      include: {
        users_reports_accused_idTousers: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    res.json(reports.map(formatReport));
  } catch (error: any) {
    console.error('[Reports] List error:', error.message);
    res.json([]);
  }
});

// GET /api/reports/:id — Inspect details of a submitted report (`app/reports/page.tsx`)
router.get('/:id', async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    const userId = BigInt(req.user.id);
    const reportId = BigInt(req.params.id);

    const report = await prisma.reports.findFirst({
      where: { id: reportId, reporter_id: userId },
      include: {
        users_reports_accused_idTousers: {
          select: { id: true, name: true },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.json({ report: formatReport(report) });
  } catch (error: any) {
    console.error('[Reports] Detail error:', error.message);
    return res.status(500).json({ message: 'Failed to load report details' });
  }
});

// POST /api/reports — Submit a new user/content moderation report
router.post('/', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { accused_id, reported_user_id, reason, details, description, message_id } = req.body || {};

    const targetId = accused_id || reported_user_id;
    if (!targetId || !/^\d+$/.test(String(targetId)) || !reason || !String(reason).trim()) {
      return res.status(400).json({ message: 'Valid accused_id and reason are required' });
    }
    if (BigInt(targetId) === userId) {
      return res.status(400).json({ message: 'You cannot file a report against your own account' });
    }

    const targetUser = await prisma.users.findUnique({
      where: { id: BigInt(targetId) },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      return res.status(404).json({ message: 'Reported user account was not found' });
    }

    const now = new Date();
    const report = await prisma.reports.create({
      data: {
        reporter_id: userId,
        accused_id: BigInt(targetId),
        reason: String(reason).trim().slice(0, 255),
        details: details || description ? String(details || description).trim() : null,
        message_id: message_id && /^\d+$/.test(String(message_id)) ? BigInt(message_id) : null,
        status: 'open',
        created_at: now,
        updated_at: now,
      },
    });

    return res.status(201).json({
      success: true,
      report: {
        id: Number(report.id),
        accused_user_id: Number(targetUser.id),
        accused_name: targetUser.name || 'Unknown',
        reason: report.reason,
        details: report.details,
        status: report.status,
        created_at: now.toISOString(),
        createdAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Reports] Create error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create report' });
  }
});

export default router;
