import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    // Detect Prisma Decimal by {s, e, d} signature or Decimal.toNumber()
    if (typeof obj.toNumber === 'function') {
      try { return obj.toNumber(); } catch { return Number(obj) || 0; }
    }
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
    for (const key of Object.keys(obj)) {
      if (key === 'password') continue;
      out[key] = serialize(obj[key]);
    }
    return out;
  }
  return obj;
}

function parseJsonField(val: any): any {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

/**
 * GET /api/venues — Search nearby physical partner venues with active check-in counts
 * and optional trust-aware ranking metadata (`app/venues/page.tsx`).
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const lat = Number(req.query.lat) || 42.3314;
    const lng = Number(req.query.lng) || -83.0458;
    const radius = Number(req.query.radius) || 50; // km
    const type = req.query.type as string | undefined;
    const rankingStrategy = (req.query.ranking_strategy as string) || 'trust-aware';

    const where: any = { is_active: true };
    if (type) where.business_type = type;

    const venues = await prisma.venues.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    });

    // Batch-count active check-ins (`checked_out_at IS NULL`) across candidate venues
    const venueIds = venues.map((v: any) => v.id);
    const checkinCounts = venueIds.length > 0
      ? await prisma.venue_checkins.groupBy({
          by: ['venue_id'],
          where: { venue_id: { in: venueIds }, checked_out_at: null },
          _count: { _all: true },
        }).catch(() => [])
      : [];
    const activeByVenue = new Map<number, number>();
    for (const row of checkinCounts as any[]) {
      activeByVenue.set(Number(row.venue_id), Number(row._count?._all || 0));
    }

    const R = 6371; // Earth radius in km
    const result = venues
      .map((v: any) => {
        const vLat = Number(v.latitude || 0);
        const vLng = Number(v.longitude || 0);
        const dLat = ((vLat - lat) * Math.PI) / 180;
        const dLon = ((vLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((vLat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        const distanceMeters = Math.round(distanceKm * 1000);
        const activeCheckins = activeByVenue.get(Number(v.id)) || 0;
        const verifiedBoost = v.verification_status === 'verified' ? 15 : 0;
        const rankingScore = Math.max(
          0,
          Math.round((100 - Math.min(distanceKm * 2, 80)) + verifiedBoost + activeCheckins * 8)
        );

        const s = serialize(v);
        return {
          ...s,
          operating_hours: parseJsonField(v.operating_hours),
          features: parseJsonField(v.features) || [],
          active_checkins: activeCheckins,
          distance_km: Math.round(distanceKm * 10) / 10,
          distance_meters: distanceMeters,
          distance: distanceMeters,
          ranking_score: rankingScore,
          scene_signals: activeCheckins > 0
            ? {
                headline: `${activeCheckins} member${activeCheckins === 1 ? '' : 's'} checked in right now`,
                matched_topics: [],
                matched_tags: [],
                score_boost: activeCheckins * 8,
              }
            : null,
        };
      })
      .filter((v: any) => v.distance_km <= radius)
      .sort((a: any, b: any) =>
        rankingStrategy === 'trust-aware'
          ? b.ranking_score - a.ranking_score || a.distance_km - b.distance_km
          : a.distance_km - b.distance_km
      );

    res.json({
      data: result,
      venues: result,
      total: result.length,
      center: { lat, lng },
      meta: {
        ranking_strategy: {
          trusted_visitors: true,
          scene_alignment: true,
          venue_health: true,
          freshness: true,
          distance: true,
          summary:
            rankingStrategy === 'trust-aware'
              ? 'Prioritizing verified partner venues, live member check-ins, and proximity to your current location.'
              : 'Sorted strictly by straight-line distance from your coordinates.',
        },
      },
    });
  } catch (error: any) {
    console.error('[Venues] List error:', error.message);
    res.json({ data: [], venues: [], total: 0 });
  }
});

/**
 * GET /api/venues/current-checkin — Retrieve the user's currently active venue check-in
 * (`checked_out_at IS NULL`), or `null` if not checked into any venue.
 *
 * Why this endpoint exists separately from `GET /api/user/checkin`:
 * `GET /api/user/checkin` returns the user's daily FWB token streak status
 * (`{ checked_in: false, streak: 0 }`). Prior to v2.3.95, `lib/api/venues.ts`
 * called `/user/checkin`, causing `/venues` to treat the non-null streak object
 * as an active venue check-in (`"Checked in at: [blank]"`).
 */
router.get('/current-checkin', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const openCheckin = await prisma.venue_checkins.findFirst({
      where: { user_id: userId, checked_out_at: null },
      include: { venues: true },
      orderBy: { created_at: 'desc' },
    });

    if (!openCheckin) {
      return res.json({ checkin: null });
    }

    const serializedVenue = openCheckin.venues ? serialize(openCheckin.venues) : null;
    return res.json({
      checkin: {
        id: Number(openCheckin.id),
        user_id: Number(openCheckin.user_id),
        venue_id: Number(openCheckin.venue_id),
        message: openCheckin.message || null,
        checked_out_at: null,
        created_at: openCheckin.created_at instanceof Date ? openCheckin.created_at.toISOString() : openCheckin.created_at,
        venue: serializedVenue,
      },
    });
  } catch (error: any) {
    console.error('[Venues] Current check-in error:', error.message);
    return res.json({ checkin: null });
  }
});

/**
 * GET /api/venues/:id — Get single venue details.
 */
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid venue ID' });
    }
    const venueId = BigInt(req.params.id);
    const venue = await prisma.venues.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    const activeCheckins = await prisma.venue_checkins.count({
      where: { venue_id: venueId, checked_out_at: null },
    }).catch(() => 0);

    const s = serialize(venue);
    return res.json({
      venue: {
        ...s,
        active_checkins: activeCheckins,
        operating_hours: parseJsonField(venue.operating_hours),
        features: parseJsonField(venue.features) || [],
      },
    });
  } catch (error: any) {
    console.error('[Venues] Get error:', error.message);
    return res.json({ venue: null });
  }
});

/**
 * GET /api/venues/:id/checkins — List active member check-ins at a venue.
 */
router.get('/:id/checkins', authenticate, async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid venue ID' });
    }
    const venueId = BigInt(req.params.id);
    const checkins = await prisma.venue_checkins.findMany({
      where: { venue_id: venueId, checked_out_at: null },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true } },
          },
        },
      },
    });

    const formatted = checkins.map((c: any) => {
      const u = c.users;
      const up = Array.isArray(u?.user_profiles) ? u.user_profiles[0] : u?.user_profiles;
      return {
        id: Number(c.id),
        user_id: Number(c.user_id),
        venue_id: Number(c.venue_id),
        message: c.message || null,
        checked_out_at: null,
        created_at: c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at,
        user: {
          id: Number(u?.id || c.user_id),
          name: up?.display_name || u?.name || 'Member',
          avatar: up?.avatar_url || null,
        },
      };
    });

    return res.json({ data: formatted, checkins: formatted });
  } catch (error: any) {
    console.error('[Venues] Check-ins list error:', error.message);
    return res.json({ data: [], checkins: [] });
  }
});

/**
 * POST /api/venues/:id/checkin — Check the authenticated user into a venue.
 * Automatically closes any previously open venue check-in for the user so at most
 * one active venue check-in exists at any point in time.
 */
router.post('/:id/checkin', authenticate, async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid venue ID' });
    }
    const userId = BigInt(req.user.id);
    const venueId = BigInt(req.params.id);

    const venue = await prisma.venues.findUnique({ where: { id: venueId } });
    if (!venue || !venue.is_active) {
      return res.status(404).json({ message: 'Venue not found or inactive' });
    }

    const now = new Date();
    const rawMessage = req.body?.message ? String(req.body.message).trim().slice(0, 280) : null;

    // Close any prior active check-ins for this user before opening the new one
    await prisma.venue_checkins.updateMany({
      where: { user_id: userId, checked_out_at: null },
      data: { checked_out_at: now, updated_at: now },
    });

    const created = await prisma.venue_checkins.create({
      data: {
        user_id: userId,
        venue_id: venueId,
        message: rawMessage || null,
        created_at: now,
        updated_at: now,
      },
    });

    return res.status(201).json({
      success: true,
      checkin: {
        id: Number(created.id),
        user_id: Number(created.user_id),
        venue_id: Number(created.venue_id),
        message: created.message,
        checked_out_at: null,
        created_at: now.toISOString(),
        venue: serialize(venue),
      },
    });
  } catch (error: any) {
    console.error('[Venues] Check-in error:', error.message);
    return res.status(500).json({ message: 'Failed to check in to venue' });
  }
});

/**
 * POST /api/venues/:id/checkout — Check the authenticated user out of a venue.
 */
router.post('/:id/checkout', authenticate, async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid venue ID' });
    }
    const userId = BigInt(req.user.id);
    const venueId = BigInt(req.params.id);
    const now = new Date();

    const updated = await prisma.venue_checkins.updateMany({
      where: { user_id: userId, venue_id: venueId, checked_out_at: null },
      data: { checked_out_at: now, updated_at: now },
    });

    return res.json({
      success: true,
      checked_out_count: updated.count,
    });
  } catch (error: any) {
    console.error('[Venues] Check-out error:', error.message);
    return res.status(500).json({ message: 'Failed to check out from venue' });
  }
});

export default router;
