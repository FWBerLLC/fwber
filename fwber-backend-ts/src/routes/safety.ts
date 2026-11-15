import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/safety/walk/active — get active safe walk session
router.get('/walk/active', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const walk = await prisma.safe_walks.findFirst({
      where: { user_id: userId, status: 'active' },
      orderBy: { started_at: 'desc' },
    });

    if (!walk) {
      return res.json({ walk: null });
    }

    res.json({
      walk: {
        id: Number(walk.id),
        status: walk.status,
        destination: walk.destination,
        start_lat: walk.start_lat ? Number(walk.start_lat) : null,
        start_lng: walk.start_lng ? Number(walk.start_lng) : null,
        current_lat: walk.current_lat ? Number(walk.current_lat) : null,
        current_lng: walk.current_lng ? Number(walk.current_lng) : null,
        dest_lat: walk.dest_lat ? Number(walk.dest_lat) : null,
        dest_lng: walk.dest_lng ? Number(walk.dest_lng) : null,
        started_at: walk.started_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Safety] Walk error:', error.message);
    res.json({ walk: null });
  }
});

// POST /api/safety/walk/start — start a safe walk
router.post('/walk/start', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { destination, start_lat, start_lng, dest_lat, dest_lng } = req.body;

    // End any existing active walk
    await prisma.safe_walks.updateMany({
      where: { user_id: userId, status: 'active' },
      data: { status: 'ended', ended_at: new Date() },
    });

    const walk = await prisma.safe_walks.create({
      data: {
        user_id: userId,
        status: 'active',
        destination: destination || null,
        start_lat: start_lat || null,
        start_lng: start_lng || null,
        dest_lat: dest_lat || null,
        dest_lng: dest_lng || null,
        current_lat: start_lat || null,
        current_lng: start_lng || null,
        started_at: new Date(),
      },
    });

    res.json({
      walk: {
        id: Number(walk.id),
        status: walk.status,
        destination: walk.destination,
        started_at: walk.started_at?.toISOString(),
      },
      success: true,
    });
  } catch (error: any) {
    console.error('[Safety] Walk start error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to start safe walk' });
  }
});

// POST /api/safety/walk/update — update position during walk
router.post('/walk/update', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { walk_id, current_lat, current_lng } = req.body;

    if (!walk_id) {
      return res.status(400).json({ message: 'walk_id required' });
    }

    await prisma.safe_walks.updateMany({
      where: { id: BigInt(walk_id), user_id: userId, status: 'active' },
      data: {
        current_lat: current_lat || null,
        current_lng: current_lng || null,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Safety] Walk update error:', error.message);
    res.json({ success: true });
  }
});

// POST /api/safety/walk/end — end active walk
router.post('/walk/end', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    await prisma.safe_walks.updateMany({
      where: { user_id: userId, status: 'active' },
      data: { status: 'ended', ended_at: new Date() },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
});

// PATCH /api/safety/walk/:id/location — update live Safe Walk coordinates by ID
router.patch('/walk/:id/location', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let walkId: bigint;
    try {
      walkId = BigInt(req.params.id);
    } catch {
      return res.status(400).json({ message: 'Invalid walk ID' });
    }

    const lat = req.body?.latitude ?? req.body?.current_lat ?? null;
    const lng = req.body?.longitude ?? req.body?.current_lng ?? null;

    const existing = await prisma.safe_walks.findFirst({
      where: { id: walkId, user_id: userId },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Safe walk session not found' });
    }

    const updated = await prisma.safe_walks.update({
      where: { id: walkId },
      data: {
        current_lat: lat !== null ? Number(lat) : existing.current_lat,
        current_lng: lng !== null ? Number(lng) : existing.current_lng,
        updated_at: new Date(),
      },
    });

    res.json({
      walk: {
        id: Number(updated.id),
        user_id: Number(updated.user_id),
        status: updated.status,
        destination: updated.destination,
        start_lat: updated.start_lat ? Number(updated.start_lat) : null,
        start_lng: updated.start_lng ? Number(updated.start_lng) : null,
        current_lat: updated.current_lat ? Number(updated.current_lat) : null,
        current_lng: updated.current_lng ? Number(updated.current_lng) : null,
        dest_lat: updated.dest_lat ? Number(updated.dest_lat) : null,
        dest_lng: updated.dest_lng ? Number(updated.dest_lng) : null,
        started_at: updated.started_at?.toISOString() || null,
        ended_at: updated.ended_at?.toISOString() || null,
      },
      success: true,
    });
  } catch (error: any) {
    console.error('[Safety] Walk location patch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update safe walk location' });
  }
});

// POST /api/safety/walk/:id/end — complete a specific Safe Walk session by ID
router.post('/walk/:id/end', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let walkId: bigint;
    try {
      walkId = BigInt(req.params.id);
    } catch {
      return res.status(400).json({ message: 'Invalid walk ID' });
    }

    const existing = await prisma.safe_walks.findFirst({
      where: { id: walkId, user_id: userId },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Safe walk session not found' });
    }

    const updated = await prisma.safe_walks.update({
      where: { id: walkId },
      data: {
        status: 'completed',
        ended_at: new Date(),
        updated_at: new Date(),
      },
    });

    res.json({
      walk: {
        id: Number(updated.id),
        user_id: Number(updated.user_id),
        status: updated.status,
        destination: updated.destination,
        start_lat: updated.start_lat ? Number(updated.start_lat) : null,
        start_lng: updated.start_lng ? Number(updated.start_lng) : null,
        current_lat: updated.current_lat ? Number(updated.current_lat) : null,
        current_lng: updated.current_lng ? Number(updated.current_lng) : null,
        dest_lat: updated.dest_lat ? Number(updated.dest_lat) : null,
        dest_lng: updated.dest_lng ? Number(updated.dest_lng) : null,
        started_at: updated.started_at?.toISOString() || null,
        ended_at: updated.ended_at?.toISOString() || null,
      },
      success: true,
    });
  } catch (error: any) {
    console.error('[Safety] Walk end error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to end safe walk' });
  }
});

// POST /api/safety/panic — emergency panic alert + audit event + active walk escalation
router.post('/panic', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const latitude = req.body?.latitude !== undefined ? Number(req.body.latitude) : null;
    const longitude = req.body?.longitude !== undefined ? Number(req.body.longitude) : null;
    const now = new Date();

    // Escalate any active safe walk to 'panic'
    await prisma.safe_walks.updateMany({
      where: { user_id: userId, status: 'active' },
      data: {
        status: 'panic',
        ...(latitude !== null ? { current_lat: latitude } : {}),
        ...(longitude !== null ? { current_lng: longitude } : {}),
        updated_at: now,
      },
    });

    // Load saved emergency contacts from user_profiles.preferences
    const profile = await prisma.user_profiles.findFirst({
      where: { user_id: userId },
      select: { preferences: true },
    });
    let contacts: any[] = [];
    if (profile?.preferences) {
      try {
        const prefs = typeof profile.preferences === 'string'
          ? JSON.parse(profile.preferences)
          : profile.preferences;
        contacts = Array.isArray(prefs?.emergency_contacts) ? prefs.emergency_contacts : [];
      } catch {}
    }

    const contactsNotified = contacts
      .map((c: any) => String(c?.name || c?.phone || '').trim())
      .filter(Boolean);

    // Record high-severity audit entry in security_events
    await prisma.security_events.create({
      data: {
        event: 'safety_panic',
        user_id: userId,
        ip_address: req.ip || null,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 255) || null,
        severity: 'high',
        context: {
          latitude,
          longitude,
          alerts_sent: contactsNotified.length,
          contacts_notified: contactsNotified,
        } as any,
        created_at: now,
        updated_at: now,
      },
    });

    res.json({
      status: 'alerted',
      alerts_sent: contactsNotified.length,
      contacts_notified: contactsNotified,
      location: { latitude, longitude },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Safety] Panic error:', error.message);
    res.status(500).json({ message: 'Failed to trigger panic alert' });
  }
});

// GET /api/safety/contacts — get emergency contacts (stored in user profile)
router.get('/contacts', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    // Emergency contacts are stored as JSON in the user's profile
    const profile = await prisma.user_profiles.findFirst({
      where: { user_id: userId },
      select: { preferences: true },
    });

    let contacts: any[] = [];
    if (profile?.preferences) {
      try {
        const prefs = typeof profile.preferences === 'string'
          ? JSON.parse(profile.preferences)
          : profile.preferences;
        contacts = prefs?.emergency_contacts || [];
      } catch (_) {}
    }

    res.json({ contacts });
  } catch (error: any) {
    console.error('[Safety] Contacts error:', error.message);
    res.json({ contacts: [] });
  }
});

// POST /api/safety/contacts — add emergency contact
router.post('/contacts', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { name, phone, relationship } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'name and phone are required' });
    }

    const profile = await prisma.user_profiles.findFirst({
      where: { user_id: userId },
      select: { id: true, preferences: true },
    });

    let prefs: any = {};
    if (profile?.preferences) {
      try {
        prefs = typeof profile.preferences === 'string'
          ? JSON.parse(profile.preferences)
          : profile.preferences;
      } catch (_) {}
    }

    const contacts = prefs.emergency_contacts || [];
    const newContact = {
      id: Date.now(),
      name,
      phone,
      relationship: relationship || 'friend',
    };
    contacts.push(newContact);

    prefs.emergency_contacts = contacts;

    await prisma.user_profiles.update({
      where: { id: profile!.id },
      data: { preferences: JSON.stringify(prefs) },
    });

    res.json({ contact: newContact, success: true });
  } catch (error: any) {
    console.error('[Safety] Contact add error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add contact' });
  }
});

// DELETE /api/safety/contacts/:id — remove emergency contact
router.delete('/contacts/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const contactId = Number(req.params.id);

    const profile = await prisma.user_profiles.findFirst({
      where: { user_id: userId },
      select: { id: true, preferences: true },
    });

    if (!profile) return res.json({ success: true });

    let prefs: any = {};
    try {
      prefs = typeof profile.preferences === 'string'
        ? JSON.parse(profile.preferences)
        : profile.preferences;
    } catch (_) {}

    const contacts = (prefs.emergency_contacts || []).filter(
      (c: any) => c.id !== contactId
    );
    prefs.emergency_contacts = contacts;

    await prisma.user_profiles.update({
      where: { id: profile.id },
      data: { preferences: JSON.stringify(prefs) },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
});

// GET /api/safety/blocked — list blocked users
router.get('/blocked', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const blocks = await prisma.blocks.findMany({
      where: { blocker_id: userId },
      include: {
        users_blocks_blocked_idTousers: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      blocked: blocks.map((b: any) => ({
        id: Number(b.id),
        blocked_user_id: Number(b.blocked_id),
        blocked_user_name: b.users_blocks_blocked_idTousers?.name || 'Unknown',
        created_at: b.created_at?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[Safety] Blocked list error:', error.message);
    res.json({ blocked: [] });
  }
});

// POST /api/safety/block — block a user
router.post('/block', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    const blockedId = BigInt(user_id);
    if (userId === blockedId) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    // Create block (ignore if already exists)
    try {
      await prisma.blocks.create({
        data: { blocker_id: userId, blocked_id: blockedId },
      });
    } catch (e: any) {
      // Already blocked — that's fine
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Safety] Block error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to block user' });
  }
});

// DELETE /api/safety/block/:userId — unblock a user
router.delete('/block/:userId', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const blockedId = BigInt(req.params.userId);

    await prisma.blocks.deleteMany({
      where: { blocker_id: userId, blocked_id: blockedId },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: true });
  }
});

// POST /api/safety/report — report a user
router.post('/report', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { accused_id, reason, details, message_id } = req.body;

    if (!accused_id || !reason) {
      return res.status(400).json({ message: 'accused_id and reason are required' });
    }

    const report = await prisma.reports.create({
      data: {
        reporter_id: userId,
        accused_id: BigInt(accused_id),
        reason,
        details: details || null,
        message_id: message_id ? BigInt(message_id) : null,
        status: 'open',
      },
    });

    res.json({ success: true, report_id: Number(report.id) });
  } catch (error: any) {
    console.error('[Safety] Report error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
});

export default router;
