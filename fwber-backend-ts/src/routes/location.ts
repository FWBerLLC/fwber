import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Helper: upsert user location
async function upsertLocation(userId: bigint, latitude: number, longitude: number, extra: any = {}) {
  const existing = await prisma.user_locations.findFirst({ where: { user_id: userId } });
  const data: any = {
    latitude,
    longitude,
    is_active: true,
    last_updated: new Date(),
    updated_at: new Date(),
    ...(extra.accuracy != null && { accuracy: extra.accuracy }),
    ...(extra.heading != null && { heading: extra.heading }),
    ...(extra.speed != null && { speed: extra.speed }),
    ...(extra.altitude != null && { altitude: extra.altitude }),
    ...(extra.privacy_level && { privacy_level: extra.privacy_level }),
  };
  if (existing) {
    return prisma.user_locations.update({ where: { id: existing.id }, data });
  }
  return prisma.user_locations.create({ data: { user_id: userId, privacy_level: 'friends', ...data } });
}

// GET /api/location/nearby - Find nearby users using Haversine formula
router.get('/nearby', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const radius = parseInt(req.query.radius as string) || 5000;
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(latitude) || isNaN(longitude)) {
      res.json({ success: true, data: [], meta: { total: 0, radius } });
      return;
    }

    // Save requesting user's location
    try {
      await upsertLocation(userId, latitude, longitude);
    } catch (e: any) {
      console.warn('[Location] Failed to save requester location:', e.message);
    }

    // Query nearby users using Haversine formula
    const nearby = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT 
        ul.user_id,
        ul.latitude,
        ul.longitude,
        ul.last_updated,
        up.display_name,
        up.gender,
        up.date_of_birth,
        up.bio,
        up.avatar_url,
        up.is_verified,
        ROUND(
          6371000 * acos(
            LEAST(1, cos(radians(${latitude})) * cos(radians(CAST(ul.latitude AS DOUBLE))) 
            * cos(radians(CAST(ul.longitude AS DOUBLE)) - radians(${longitude})) 
            + sin(radians(${latitude})) * sin(radians(CAST(ul.latitude AS DOUBLE))))
          )
        ) AS distance_meters
      FROM user_locations ul
      LEFT JOIN user_profiles up ON up.user_id = ul.user_id
      WHERE ul.user_id != ${userId.toString()}
        AND ul.is_active = 1
        AND ul.privacy_level != 'private'
        AND ul.last_updated > DATE_SUB(NOW(), INTERVAL 30 DAY)
      HAVING distance_meters <= ${radius}
      ORDER BY distance_meters ASC
      LIMIT ${limit}
    `);

    const users = nearby.map((row: any) => {
      const age = row.date_of_birth
        ? new Date().getFullYear() - new Date(row.date_of_birth).getFullYear()
        : null;
      const distMeters = Number(row.distance_meters) || 0;
    const distMiles = parseFloat((distMeters / 1609.34).toFixed(1));
      let distanceStr: string;
      if (distMeters < 1000) {
        distanceStr = Math.round(distMeters) + 'm';
      } else {
        distanceStr = (distMeters / 1000).toFixed(1) + 'km';
      }

      return {
        id: Number(row.user_id),
        display_name: row.display_name || 'Anonymous',
        age,
        gender: row.gender || null,
        bio: row.bio || null,
        avatar_url: row.avatar_url || null,
        is_verified: Boolean(row.is_verified),
        is_recent: row.last_updated && (Date.now() - new Date(row.last_updated).getTime()) < 3600000,
        ranking_score: Math.max(0, 100 - (distMeters / 100)),
        location: {
          distance: distanceStr,
          distance_meters: distMeters,
          distance_miles: distMiles,
          last_updated: row.last_updated ? new Date(row.last_updated).toISOString() : new Date().toISOString(),
        },
        scene_signals: null,
      distance: distanceStr,
      distance_miles: distMiles,
      distance_meters: distMeters,
      };
    });

    res.json({
      success: true,
      data: users,
      meta: {
        total: users.length,
        radius,
        ranking_strategy: { summary: 'Ordered by proximity. Closer users ranked higher.' },
      },
    });
  } catch (error: any) {
    console.error('[Location] Nearby error:', error.message);
    res.json({ success: true, data: [], meta: { total: 0, radius: Number(req.query.radius) || 5000 } });
  }
});

// POST /api/location/update - Update user's location
router.post('/update', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { latitude, longitude, accuracy, heading, speed, altitude, privacy_level } = req.body;
    if (!latitude || !longitude) {
      res.json({ success: true });
      return;
    }
    await upsertLocation(userId, Number(latitude), Number(longitude), { accuracy, heading, speed, altitude, privacy_level });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Location] Update error:', error.message);
    res.json({ success: true });
  }
});

// GET /api/location/status
router.get('/status', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const location = await prisma.user_locations.findFirst({ where: { user_id: userId } });
    res.json({
      location_shared: !!location,
      latitude: location ? Number(location.latitude) : null,
      longitude: location ? Number(location.longitude) : null,
      privacy_level: location?.privacy_level || 'friends',
    });
  } catch (error) {
    res.json({ location_shared: false, latitude: null, longitude: null });
  }
});

// GET /api/location - Get user's current location
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const location = await prisma.user_locations.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
    res.json({
      data: location ? {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        privacy_level: location.privacy_level,
        updated_at: location.updated_at?.toISOString() || null,
      } : { latitude: null, longitude: null, updated_at: null },
    });
  } catch (error) {
    res.json({ data: { latitude: null, longitude: null, updated_at: null } });
  }
});

// POST /api/location - Update user's location
router.post('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { latitude, longitude, accuracy, heading, speed, altitude, privacy_level } = req.body;
    if (!latitude || !longitude) {
      res.json({ data: { latitude, longitude, updated_at: new Date().toISOString() } });
      return;
    }
    await upsertLocation(userId, Number(latitude), Number(longitude), { accuracy, heading, speed, altitude, privacy_level });
    res.json({ data: { latitude, longitude, updated_at: new Date().toISOString() } });
  } catch (error: any) {
    console.error('[Location] POST error:', error.message);
    res.json({ data: { latitude: req.body.latitude, longitude: req.body.longitude, updated_at: new Date().toISOString() } });
  }
});

// GET /api/location/privacy - Get location privacy settings
router.get('/privacy', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const location = await prisma.user_locations.findFirst({ where: { user_id: userId } });
    res.json({
      location_shared: !!location && location.is_active !== false,
      privacy_level: location?.privacy_level || 'friends',
      show_distance: true,
      show_city: true,
      precision_mode: 'city',  // 'exact', 'neighborhood', 'city'
      options: ['public', 'friends', 'private'],
    });
  } catch (error) {
    res.json({ location_shared: false, privacy_level: 'friends', show_distance: true, show_city: true, precision_mode: 'city', options: ['public', 'friends', 'private'] });
  }
});

// PUT /api/location/privacy - Update location privacy
router.put('/privacy', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { privacy_level } = req.body;
    const existing = await prisma.user_locations.findFirst({ where: { user_id: userId } });
    if (existing) {
      await prisma.user_locations.update({ where: { id: existing.id }, data: { privacy_level: privacy_level || 'friends' } });
    }
    res.json({ data: { privacy_level, privacy_level_display: privacy_level } });
  } catch (error) {
    res.json({ data: { privacy_level: req.body.privacy_level, privacy_level_display: req.body.privacy_level } });
  }
});

// DELETE /api/location - Deactivate location
router.delete('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    await prisma.user_locations.updateMany({ where: { user_id: userId }, data: { is_active: false } });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
  }
});

/**
 * GET /api/location/aura/:matchId — Privacy-guarded AR Aura beacon (`MatchARView.tsx`).
 * Resolves `:matchId` as either a `matches.id` or partner `users.id`, enforces a
 * bidirectional block check (`403`), verifies an accepted match or friendship exists,
 * and refuses coordinates when the partner's `privacy_level === 'private'` or location is inactive.
 */
router.get('/aura/:matchId', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let paramId: bigint;
    try {
      paramId = BigInt(req.params.matchId);
    } catch {
      return res.status(400).json({ error: 'Invalid match or user ID' });
    }

    let partnerId: bigint | null = null;
    const matchById = await prisma.matches.findUnique({ where: { id: paramId } });
    if (matchById && matchById.status === 'accepted' && (matchById.user1_id === userId || matchById.user2_id === userId)) {
      partnerId = matchById.user1_id === userId ? matchById.user2_id : matchById.user1_id;
    } else {
      const [directMatch, friendship] = await Promise.all([
        prisma.matches.findFirst({
          where: {
            status: 'accepted',
            is_active: true,
            OR: [
              { user1_id: userId, user2_id: paramId },
              { user1_id: paramId, user2_id: userId },
            ],
          },
        }),
        prisma.friends.findFirst({
          where: {
            status: 'accepted',
            OR: [
              { user_id: userId, friend_id: paramId },
              { user_id: paramId, friend_id: userId },
            ],
          },
        }).catch(() => null),
      ]);
      if (directMatch || friendship) {
        partnerId = paramId;
      }
    }

    if (!partnerId) {
      return res.status(404).json({ error: 'Accepted match required to view AR Aura' });
    }

    const blocked = await prisma.blocks.findFirst({
      where: {
        OR: [
          { blocker_id: userId, blocked_id: partnerId },
          { blocker_id: partnerId, blocked_id: userId },
        ],
      },
    });
    if (blocked) {
      return res.status(403).json({ error: 'Location unavailable for blocked user' });
    }

    const [loc, partnerUser] = await Promise.all([
      prisma.user_locations.findFirst({
        where: { user_id: partnerId, is_active: true },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.users.findUnique({
        where: { id: partnerId },
        include: { user_profiles: { select: { display_name: true }, take: 1 } },
      }),
    ]);

    if (!loc || loc.privacy_level === 'private') {
      return res.status(404).json({ error: 'Match has not shared live AR Aura location' });
    }

    return res.json({
      data: {
        id: Number(partnerId),
        name: partnerUser?.user_profiles?.[0]?.display_name || partnerUser?.name || 'Match',
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        last_updated: (loc.last_updated || loc.updated_at || new Date()).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Location] Aura error:', error.message);
    return res.status(500).json({ error: 'Failed to load AR Aura location' });
  }
});

export default router;
