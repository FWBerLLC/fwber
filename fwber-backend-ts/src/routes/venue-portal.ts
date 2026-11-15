import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { createRateLimiter } from '../lib/rateLimit.js';

/**
 * Venue Partner Portal Router (`/api/venue`)
 *
 * Why this router exists separately from `/api/venues`:
 * - `/api/venues` serves regular FWBer users discovering, browsing, and checking
 *   into nearby physical partner venues (authenticated via user `users` JWTs).
 * - `/api/venue` powers the standalone B2B Venue Partner Portal (`/venue/register`,
 *   `/venue/login`, `/venue/dashboard`), which authenticates directly against the
 *   dedicated `venues` table (`localStorage.getItem('venue_token')`) using a
 *   role-scoped JWT (`{ venueId, role: 'venue', email }`).
 *
 * Prior to v2.3.95, `/api/venue` was unmounted in `fwber-backend-ts`, causing
 * registration/login POSTs to fall through to the `/api` catch-all (`{ success: true }`
 * with `token: undefined`) and `GET /api/venue/me` to return `[]`.
 */
const router = Router();

const venueRegisterLimiter = createRateLimiter({ name: 'venue-register', windowMs: 60_000, max: 10 });
const venueLoginLimiter = createRateLimiter({ name: 'venue-login', windowMs: 60_000, max: 15 });

const ALLOWED_BUSINESS_TYPES = new Set(['bar', 'club', 'restaurant', 'cafe', 'lounge', 'event_space', 'other']);

interface VenueAuthRequest extends Request {
  venue?: any;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'secret';
}

function signVenueToken(venue: { id: bigint | number; email: string }): string {
  return jwt.sign(
    {
      venueId: Number(venue.id),
      role: 'venue',
      email: venue.email,
    },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
}

function parseJsonSafe(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(String(val));
  } catch {
    return val;
  }
}

function serializeDecimal(val: any): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Strips password hashes and normalizes BigInt / Decimal / Date fields for JSON
 * transport, aliasing `max_capacity` as `capacity` for `app/venue/dashboard/page.tsx`.
 */
function serializeVenue(venue: any) {
  if (!venue) return null;
  return {
    id: Number(venue.id),
    name: venue.name,
    email: venue.email,
    business_type: venue.business_type || 'other',
    description: venue.description || '',
    address: venue.address || '',
    city: venue.city || '',
    state: venue.state || '',
    country: venue.country || 'US',
    zip_code: venue.zip_code || '',
    latitude: serializeDecimal(venue.latitude),
    longitude: serializeDecimal(venue.longitude),
    phone: venue.phone || '',
    website: venue.website || '',
    operating_hours: parseJsonSafe(venue.operating_hours),
    max_capacity: Number(venue.max_capacity ?? 100),
    capacity: Number(venue.max_capacity ?? 100),
    verification_status: venue.verification_status || 'pending',
    subscription_tier: venue.subscription_tier || 'starter',
    is_active: Boolean(venue.is_active ?? true),
    features: parseJsonSafe(venue.features) || [],
    created_at: venue.created_at instanceof Date ? venue.created_at.toISOString() : venue.created_at,
    updated_at: venue.updated_at instanceof Date ? venue.updated_at.toISOString() : venue.updated_at,
  };
}

/**
 * Middleware verifying a `role: 'venue'` Bearer token issued by `/api/venue/login`
 * or `/api/venue/register`. Rejects standard user JWTs (`role !== 'venue'`) so
 * user tokens cannot mutate or inspect partner accounts with matching numeric IDs.
 */
export async function authenticateVenue(req: VenueAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ message: 'Venue authentication required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { venueId?: number; role?: string };
    if (decoded.role !== 'venue' || !decoded.venueId) {
      return res.status(403).json({ message: 'Invalid venue token scope' });
    }

    const venue = await prisma.venues.findUnique({
      where: { id: BigInt(decoded.venueId) },
    });

    if (!venue) {
      return res.status(401).json({ message: 'Venue account not found' });
    }

    req.venue = venue;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired venue token' });
  }
}

/**
 * POST /api/venue/register — Onboard a new partner venue account.
 */
router.post('/register', venueRegisterLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const passwordConfirmation = body.password_confirmation !== undefined ? String(body.password_confirmation) : password;
    const rawType = String(body.business_type || 'bar').trim().toLowerCase();
    const businessType = ALLOWED_BUSINESS_TYPES.has(rawType) ? rawType : 'other';
    const address = String(body.address || '').trim();

    if (!name || !email || !password || !address) {
      return res.status(400).json({ message: 'Venue name, email, password, and address are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ message: 'Password confirmation does not match' });
    }

    const existing = await prisma.venues.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'A venue with this email address is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const lat = body.latitude !== undefined && body.latitude !== '' ? Number(body.latitude) : 42.3314;
    const lng = body.longitude !== undefined && body.longitude !== '' ? Number(body.longitude) : -83.0458;
    const maxCapacity = Math.max(1, Number(body.capacity ?? body.max_capacity) || 100);

    const venue = await prisma.venues.create({
      data: {
        name: name.slice(0, 255),
        email: email.slice(0, 255),
        password: hashedPassword,
        business_type: businessType,
        description: body.description ? String(body.description).trim() : null,
        address: address.slice(0, 255),
        city: body.city ? String(body.city).trim().slice(0, 255) : 'Detroit',
        state: body.state ? String(body.state).trim().slice(0, 255) : 'MI',
        country: body.country ? String(body.country).trim().slice(0, 255) : 'US',
        zip_code: body.zip_code ? String(body.zip_code).trim().slice(0, 255) : null,
        latitude: Number.isFinite(lat) ? lat : 42.3314,
        longitude: Number.isFinite(lng) ? lng : -83.0458,
        phone: body.phone ? String(body.phone).trim().slice(0, 255) : null,
        website: body.website ? String(body.website).trim().slice(0, 255) : null,
        max_capacity: maxCapacity,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    });

    const token = signVenueToken(venue);
    return res.status(201).json({
      token,
      venue: serializeVenue(venue),
    });
  } catch (error: any) {
    console.error('[VenuePortal] Register error:', error.message);
    return res.status(500).json({ message: 'Failed to register venue partner account' });
  }
});

/**
 * POST /api/venue/login — Authenticate an existing venue partner.
 */
router.post('/login', venueLoginLimiter, async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const venue = await prisma.venues.findUnique({ where: { email } });
    if (!venue || !venue.password) {
      return res.status(401).json({ message: 'Invalid venue email or password' });
    }

    // Normalize legacy PHP/Laravel `$2y$` bcrypt prefixes so `bcryptjs` can verify migrated rows.
    const normalizedHash = venue.password.replace(/^\$2y\$/, '$2a$');
    const valid = await bcrypt.compare(password, normalizedHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid venue email or password' });
    }

    const token = signVenueToken(venue);
    return res.json({
      token,
      venue: serializeVenue(venue),
    });
  } catch (error: any) {
    console.error('[VenuePortal] Login error:', error.message);
    return res.status(500).json({ message: 'Failed to sign in to venue portal' });
  }
});

/**
 * GET /api/venue/me — Hydrate partner dashboard with venue profile + live check-in & event telemetry.
 */
router.get('/me', authenticateVenue, async (req: VenueAuthRequest, res: Response) => {
  try {
    const venue = req.venue;
    const venueId = BigInt(venue.id);

    const [activeCheckins, totalCheckins, activeEvents, recentCheckins] = await Promise.all([
      prisma.venue_checkins.count({
        where: { venue_id: venueId, checked_out_at: null },
      }),
      prisma.venue_checkins.count({
        where: { venue_id: venueId },
      }),
      prisma.events.count({
        where: {
          location_name: { contains: venue.name },
          status: { in: ['upcoming', 'ongoing'] as any },
        },
      }).catch(() => 0),
      prisma.venue_checkins.findMany({
        where: { venue_id: venueId },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              user_profiles: { select: { display_name: true, avatar_url: true } },
            },
          },
        },
      }).catch(() => []),
    ]);

    const formattedCheckins = recentCheckins.map((c: any) => {
      const u = c.users;
      const up = Array.isArray(u?.user_profiles) ? u.user_profiles[0] : u?.user_profiles;
      return {
        id: Number(c.id),
        user_id: Number(c.user_id),
        user_name: up?.display_name || u?.name || 'Guest',
        avatar_url: up?.avatar_url || null,
        message: c.message || null,
        active: !c.checked_out_at,
        created_at: c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at,
        checked_out_at: c.checked_out_at instanceof Date ? c.checked_out_at.toISOString() : c.checked_out_at,
      };
    });

    return res.json({
      ...serializeVenue(venue),
      active_events: activeEvents,
      active_checkins: activeCheckins,
      total_checkins: totalCheckins,
      stats: {
        active_events: activeEvents,
        active_checkins: activeCheckins,
        total_checkins: totalCheckins,
      },
      recent_checkins: formattedCheckins,
    });
  } catch (error: any) {
    console.error('[VenuePortal] GET /me error:', error.message);
    return res.status(500).json({ message: 'Failed to load venue dashboard' });
  }
});

/**
 * PUT /api/venue/me — Update venue partner profile details from `/venue/dashboard`.
 */
router.put('/me', authenticateVenue, async (req: VenueAuthRequest, res: Response) => {
  try {
    const venueId = BigInt(req.venue.id);
    const body = req.body || {};
    const data: Record<string, any> = { updated_at: new Date() };

    if (body.name !== undefined && String(body.name).trim()) {
      data.name = String(body.name).trim().slice(0, 255);
    }
    if (body.business_type !== undefined) {
      const rawType = String(body.business_type).trim().toLowerCase();
      if (ALLOWED_BUSINESS_TYPES.has(rawType)) {
        data.business_type = rawType;
      }
    }
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.address !== undefined && String(body.address).trim()) {
      data.address = String(body.address).trim().slice(0, 255);
    }
    if (body.city !== undefined) {
      data.city = body.city ? String(body.city).trim().slice(0, 255) : null;
    }
    if (body.state !== undefined) {
      data.state = body.state ? String(body.state).trim().slice(0, 255) : null;
    }
    if (body.zip_code !== undefined) {
      data.zip_code = body.zip_code ? String(body.zip_code).trim().slice(0, 255) : null;
    }
    if (body.phone !== undefined) {
      data.phone = body.phone ? String(body.phone).trim().slice(0, 255) : null;
    }
    if (body.website !== undefined) {
      data.website = body.website ? String(body.website).trim().slice(0, 255) : null;
    }
    const rawCap = body.capacity ?? body.max_capacity;
    if (rawCap !== undefined && rawCap !== '') {
      const parsedCap = Number(rawCap);
      if (Number.isFinite(parsedCap) && parsedCap > 0) {
        data.max_capacity = Math.round(parsedCap);
      }
    }
    if (body.latitude !== undefined && body.latitude !== '') {
      const lat = Number(body.latitude);
      if (Number.isFinite(lat) && lat >= -90 && lat <= 90) data.latitude = lat;
    }
    if (body.longitude !== undefined && body.longitude !== '') {
      const lng = Number(body.longitude);
      if (Number.isFinite(lng) && lng >= -180 && lng <= 180) data.longitude = lng;
    }
    if (body.operating_hours !== undefined) {
      data.operating_hours = body.operating_hours;
    }
    if (body.features !== undefined) {
      data.features = body.features;
    }

    const updated = await prisma.venues.update({
      where: { id: venueId },
      data,
    });

    return res.json({
      success: true,
      venue: serializeVenue(updated),
    });
  } catch (error: any) {
    console.error('[VenuePortal] PUT /me error:', error.message);
    return res.status(500).json({ message: 'Failed to update venue profile' });
  }
});

export default router;
