import { Router, type Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Admin Diagnostics Router (`/api/admin`)
 *
 * Serves `components/admin/LogViewer.tsx` (`GET /api/admin/logs` and
 * `GET /api/admin/logs/:filename`) with strict moderator/admin authorization
 * and path-traversal isolation:
 * 1. Only filenames matching `^[a-zA-Z0-9._-]+$` and scoped to `fwber*` PM2 logs
 *    or local `./logs` files are ever listed or read — co-hosted tenant logs on
 *    shared servers are never exposed!
 * 2. Always includes a virtual `autonomous-audit.log` synthesized from recent
 *    `prisma.autonomous_actions` + `security_events` so operators can inspect
 *    runtime events even in container/ephemeral environments with no `.log` files.
 */
const router = Router();
router.use(authenticate);

const VIRTUAL_AUDIT_LOG = 'autonomous-audit.log';
const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]{1,128}$/;

async function requireAdminOrMod(userId: bigint): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { is_moderator: true, role: true },
  });
  if (!user) return false;
  return Boolean(user.is_moderator || user.role === 'admin' || user.role === 'moderator');
}

function discoverAllowedLogFiles(): Map<string, string> {
  const map = new Map<string, string>();
  const pm2Dir = process.env.PM2_LOG_DIR || path.join(os.homedir(), '.pm2', 'logs');
  const candidates = [
    { dir: path.resolve(process.cwd(), 'logs'), sharedPm2: false },
    { dir: pm2Dir, sharedPm2: true },
  ];

  for (const { dir, sharedPm2 } of candidates) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        if (!entry.endsWith('.log') || !SAFE_FILENAME_RE.test(entry)) continue;
        // In shared ~/.pm2/logs (or PM2_LOG_DIR), strictly expose ONLY fwber-* logs!
        if (sharedPm2 && !entry.startsWith('fwber-')) continue;
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          map.set(entry, full);
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }
  return map;
}

async function buildVirtualAuditLog(): Promise<string> {
  const [actions, secEvents] = await Promise.all([
    prisma.autonomous_actions.findMany({
      orderBy: { created_at: 'desc' },
      take: 40,
    }).catch(() => []),
    prisma.security_events.findMany({
      orderBy: { created_at: 'desc' },
      take: 25,
    }).catch(() => []),
  ]);

  const lines: string[] = [
    `=== fwber Runtime Audit Stream (${new Date().toISOString()}) ===`,
    '',
    '--- Recent Autonomous Actions ---',
  ];

  if (actions.length === 0) {
    lines.push('(no autonomous_actions rows recorded)');
  } else {
    for (const a of actions as any[]) {
      lines.push(`[${a.created_at?.toISOString() ?? 'unknown'}] [${a.status || 'info'}] ${a.action_type || 'action'} :: ${JSON.stringify(a.details ?? {})}`);
    }
  }

  lines.push('', '--- Recent Security Events ---');
  if (secEvents.length === 0) {
    lines.push('(no security_events rows recorded)');
  } else {
    for (const s of secEvents as any[]) {
      lines.push(`[${s.created_at?.toISOString() ?? 'unknown'}] [${s.severity || 'low'}] user=${s.user_id ?? 'anon'} ${s.event_type}: ${s.description || ''}`);
    }
  }

  return lines.join('\n');
}

// GET /api/admin/logs
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await requireAdminOrMod(userId))) {
      return res.status(403).json({ message: 'Admin or moderator access required' });
    }

    const fileMap = discoverAllowedLogFiles();
    const list: Array<{ name: string; size: number; updated_at: string }> = [];

    for (const [name, fullPath] of fileMap.entries()) {
      try {
        const stat = fs.statSync(fullPath);
        list.push({
          name,
          size: stat.size,
          updated_at: stat.mtime.toISOString(),
        });
      } catch {}
    }

    const virtualContent = await buildVirtualAuditLog();
    list.unshift({
      name: VIRTUAL_AUDIT_LOG,
      size: Buffer.byteLength(virtualContent, 'utf8'),
      updated_at: new Date().toISOString(),
    });

    return res.json(list);
  } catch (err: any) {
    console.error('[GET /api/admin/logs]', err.message);
    return res.status(500).json({ message: 'Failed to list logs' });
  }
});

// GET /api/admin/logs/:filename
router.get('/logs/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    if (!(await requireAdminOrMod(userId))) {
      return res.status(403).json({ message: 'Admin or moderator access required' });
    }

    const rawName = String(req.params.filename || '');
    const safeName = path.basename(rawName);
    if (safeName !== rawName || !SAFE_FILENAME_RE.test(safeName)) {
      return res.status(400).json({ message: 'Invalid log filename' });
    }

    if (safeName === VIRTUAL_AUDIT_LOG) {
      const content = await buildVirtualAuditLog();
      return res.json({ filename: safeName, content });
    }

    const fileMap = discoverAllowedLogFiles();
    const fullPath = fileMap.get(safeName);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Log file not found' });
    }

    // Read only the trailing 64 KB so multi-megabyte PM2 logs never spike heap memory
    const stat = fs.statSync(fullPath);
    const maxBytes = 64 * 1024;
    const start = Math.max(0, stat.size - maxBytes);
    const length = stat.size - start;
    const buf = Buffer.alloc(length);
    const fd = fs.openSync(fullPath, 'r');
    try {
      fs.readSync(fd, buf, 0, length, start);
    } finally {
      fs.closeSync(fd);
    }

    return res.json({
      filename: safeName,
      content: buf.toString('utf8'),
    });
  } catch (err: any) {
    console.error('[GET /api/admin/logs/:filename]', err.message);
    return res.status(500).json({ message: 'Failed to read log file' });
  }
});

export default router;
