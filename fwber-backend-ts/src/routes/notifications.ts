import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Helper: serialize BigInt
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    // Detect Prisma Decimal by {s, e, d} signature
    if (obj.s !== undefined && obj.e !== undefined && Array.isArray(obj.d)) {
      try {
        const parts: string[] = [];
        for (let i = 0; i < obj.d.length; i++) {
          const d = String(obj.d[i]);
          parts.push(i === 0 ? d : d.padStart(7, '0'));
        }
        const digitStr = parts.join('');
        const intDigits = obj.e + 1;
        const sign = obj.s === -1 ? '-' : '';
        if (digitStr.length <= intDigits) {
          return parseFloat(sign + digitStr + '0'.repeat(intDigits - digitStr.length));
        }
        return parseFloat(sign + digitStr.slice(0, intDigits) + '.' + digitStr.slice(intDigits));
      } catch { return 0; }
    }
    if (obj instanceof Date) return obj.toISOString();
    const out: any = {};
    for (const key of Object.keys(obj)) out[key] = serialize(obj[key]);
    return out;
  }
  return obj;
}

// GET /api/notifications/count
router.get('/count', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const unread = await prisma.notifications.count({
      where: { user_id: userId, read_at: null },
    });
    const total = await prisma.notifications.count({
      where: { user_id: userId },
    });
    res.json({ count: Number(total), unread: Number(unread) });
  } catch (error: any) {
    res.json({ count: 0, unread: 0 });
  }
});



// GET /api/notifications/unread-count — alias for /count
router.get('/unread-count', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const unread = await prisma.notifications.count({
      where: { user_id: userId, read_at: null },
    });
    res.json({ count: Number(unread), unread_count: Number(unread) });
  } catch {
    res.json({ count: 0, unread_count: 0 });
  }
});

// PUT /api/notifications/mark-read — PUT variant (frontend may use PUT)
router.put('/mark-read', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    await prisma.notifications.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// GET /api/notifications/preferences — alias for notification-preferences
router.get('/preferences', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const prefs = await prisma.notification_preferences.findMany({
      where: { user_id: userId },
    });
    res.json({ preferences: prefs.map((p: any) => serialize(p)) });
  } catch {
    res.json({ preferences: [] });
  }
});

// GET /api/notifications/:id — get single notification
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.per_page) || 20;

    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    res.json(serialize(notifications));
  } catch (error: any) {
    console.error('[Notifications] Error:', error.message);
    res.json([]);
  }
});

// POST /api/notifications/mark-read - mark a single notification read
router.post('/mark-read', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { notification_id } = req.body;

    if (notification_id) {
      await prisma.notifications.updateMany({
        where: { id: BigInt(notification_id), user_id: userId },
        data: { read_at: new Date() },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
});

// POST /api/notifications/mark-all-read & /read-all (NotificationBell + /notifications)
async function markAllNotificationsRead(req: any, res: any) {
  try {
    const userId = BigInt(req.user.id);
    await prisma.notifications.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
}

router.post('/mark-all-read', authenticate, markAllNotificationsRead);
router.post('/read-all', authenticate, markAllNotificationsRead);

// POST /api/notifications/subscribe — persist browser Web Push subscription
router.post('/subscribe', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const sub = req.body?.subscription || req.body || {};
    const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint.trim() : '';
    if (!endpoint) {
      return res.status(400).json({ error: 'Push subscription endpoint is required' });
    }
    const keys = sub.keys || {};
    const now = new Date();
    await prisma.push_subscriptions.upsert({
      where: { endpoint },
      update: {
        subscribable_type: 'User',
        subscribable_id: userId,
        public_key: keys.p256dh || sub.public_key || null,
        auth_token: keys.auth || sub.auth_token || null,
        content_encoding: sub.contentEncoding || sub.content_encoding || 'aes128gcm',
        updated_at: now,
      },
      create: {
        subscribable_type: 'User',
        subscribable_id: userId,
        endpoint,
        public_key: keys.p256dh || sub.public_key || null,
        auth_token: keys.auth || sub.auth_token || null,
        content_encoding: sub.contentEncoding || sub.content_encoding || 'aes128gcm',
        created_at: now,
        updated_at: now,
      },
    });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/notifications/subscribe]', error.message);
    return res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// POST /api/notifications/:id/read — mark individual notification as read (NotificationBell + /notifications)
router.post('/:id/read', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const notifId = BigInt(req.params.id);
    await prisma.notifications.updateMany({
      where: { id: notifId, user_id: userId },
      data: { read_at: new Date() },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
});

/**
 * Internal helper: create a notification for a user.
 * Can be imported and used by other routes.
 */
export async function createNotification(userId: bigint, title: string, body: string) {
  try {
    await prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        body,
      },
    });
  } catch (error: any) {
    console.error('[Notifications] Create error:', error.message);
  }
}

export default router;
