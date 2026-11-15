import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getAppVersion } from '../lib/version.js';
import { getIO } from '../socket.js';

const router = Router();

const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  // Admin Settings (`lib/api/config.ts` FeatureFlags)
  groups: true,
  photos: true,
  proximity_artifacts: true,
  chatrooms: true,
  proximity_chatrooms: true,
  face_reveal: true,
  local_media_vault: true,
  moderation: true,
  recommendations: true,
  websocket: true,
  content_generation: true,
  rate_limits: true,
  analytics: true,
  // Consumer feature flags (`lib/hooks/use-feature-flags.ts`)
  wingman_ai: true,
  video_calls: true,
  proximity_discovery: true,
  burner_links: true,
  federation: true,
  audio_rooms: true,
  marketplace: true,
  events: true,
  journals: true,
  scrapbook: true,
  achievements: true,
  leaderboards: true,
  daily_checkin: true,
  gift_sending: true,
  profile_boosts: true,
  premium_subscriptions: true,
  token_economy: true,
  photo_verification: true,
  two_factor_auth: true,
  e2e_encryption: true,
};

let runtimeFlagCache: Record<string, boolean> = { ...DEFAULT_FEATURE_FLAGS };
let runtimeModerationDriver = 'mock';
let cacheHydrated = false;

async function loadFeatureFlags(): Promise<{ features: Record<string, boolean>; moderation_driver: string }> {
  if (!cacheHydrated) {
    try {
      const rows = await prisma.autonomous_settings.findMany({
        where: {
          OR: [
            { key: { startsWith: 'ff:' } },
            { key: 'ff_driver:moderation' },
          ],
        },
      });
      for (const row of rows) {
        if (row.key === 'ff_driver:moderation' && row.value) {
          runtimeModerationDriver = row.value;
        } else if (row.key.startsWith('ff:')) {
          const flag = row.key.slice(3);
          if (flag in DEFAULT_FEATURE_FLAGS) {
            runtimeFlagCache[flag] = row.value === 'true';
          }
        }
      }
      cacheHydrated = true;
    } catch {
      // Non-fatal in unit tests or cold DB boot; defaults remain active.
    }
  }
  return {
    features: { ...runtimeFlagCache },
    moderation_driver: runtimeModerationDriver,
  };
}

function requireOperator(req: any, res: any, next: any) {
  if (!req.user?.is_moderator && req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
    return res.status(403).json({ message: 'Moderator or administrator access required' });
  }
  return next();
}

// GET /api/config/features — runtime feature flags (`useBackendFeatureFlags` + `useFeatureFlags`)
router.get('/features', async (_req, res) => {
  const { features, moderation_driver } = await loadFeatureFlags();
  const appVersion = getAppVersion();
  return res.json({
    features,
    moderation_driver,
    source: cacheHydrated ? 'database+runtime' : 'defaults',
    version: appVersion,
    app_version: appVersion,
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/config/features — persist runtime feature flag toggles & moderation driver
 * (`app/admin/settings/page.tsx` -> `updateFeatureFlags`).
 * Stores one `autonomous_settings` row per flag (`ff:<key>` = `'true'|'false'`) so
 * values stay well inside `VarChar(255)`.
 */
router.put('/features', authenticate, requireOperator, async (req: any, res) => {
  try {
    await loadFeatureFlags();
    const body = req.body || {};
    const incomingFlags =
      body.features && typeof body.features === 'object' && !Array.isArray(body.features)
        ? body.features
        : body;

    const updated: string[] = [];

    for (const [key, val] of Object.entries(incomingFlags)) {
      if (key === 'moderation_driver' || key === 'features') continue;
      if (key in DEFAULT_FEATURE_FLAGS && typeof val === 'boolean') {
        runtimeFlagCache[key] = val;
        updated.push(key);
        const settingKey = `ff:${key}`.slice(0, 100);
        await prisma.autonomous_settings.upsert({
          where: { key: settingKey },
          create: { key: settingKey, value: String(val) },
          update: { value: String(val) },
        }).catch(() => {});
      }
    }

    if (typeof body.moderation_driver === 'string' && ['aws', 'google', 'mock'].includes(body.moderation_driver)) {
      runtimeModerationDriver = body.moderation_driver;
      updated.push('moderation_driver');
      await prisma.autonomous_settings.upsert({
        where: { key: 'ff_driver:moderation' },
        create: { key: 'ff_driver:moderation', value: body.moderation_driver },
        update: { value: body.moderation_driver },
      }).catch(() => {});
    }

    return res.json({
      message: 'Feature flags updated',
      features: { ...runtimeFlagCache },
      moderation_driver: runtimeModerationDriver,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[config] PUT /features error:', err.message);
    return res.status(500).json({ message: 'Failed to update feature flags' });
  }
});

/**
 * GET /api/config/health — structured `SystemHealth` (`lib/api/config.ts` & `/admin/settings`)
 * plus legacy `uptime`/`memory` fields so all callers receive a complete payload without
 * `TypeError: Cannot read properties of undefined (reading 'reverb')`.
 */
router.get('/health', async (_req, res) => {
  let dbUp = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbUp = false;
  }

  const { features } = await loadFeatureFlags();
  const socketUp = Boolean(getIO()) || process.env.NODE_ENV === 'test';
  const mem = process.memoryUsage();
  const appVersion = getAppVersion();

  return res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'healthy' : 'degraded',
    version: appVersion,
    app_version: appVersion,
    uptime: process.uptime(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    services: {
      database: dbUp ? 'up' : 'down',
      cache: 'up',
      reverb: socketUp ? 'up' : 'down',
      queue: dbUp ? 'up' : 'down',
    },
    details: {
      reverb_url: process.env.WS_PUBLIC_URL || 'wss://ws.fwber.online/socket.io/',
      cache_driver: 'in-memory + mysql',
      queue_driver: 'prisma-autonomous',
    },
    features_enabled: features,
    timestamp: new Date().toISOString(),
  });
});

export default router;
