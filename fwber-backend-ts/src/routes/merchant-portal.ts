import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { PromotionService } from '../services/PromotionService.js';

const router = Router();
router.use(authenticate);

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

// Helper: get merchant profile for current user
async function getMerchantProfile(userId: bigint) {
  return prisma.merchant_profiles.findUnique({
    where: { user_id: userId },
  });
}

// POST /api/merchant-portal/register — register as merchant
router.post('/register', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { business_name, description, category, address } = req.body;

    if (!business_name || !category) {
      return res.status(400).json({ message: 'business_name and category are required' });
    }

    // Check if already registered
    const existing = await getMerchantProfile(userId);
    if (existing) {
      return res.status(400).json({ message: 'Already registered as merchant', merchant: serialize(existing) });
    }

    const profile = await prisma.merchant_profiles.create({
      data: {
        user_id: userId,
        business_name,
        description: description || null,
        category,
        address: address || null,
        verification_status: 'pending',
      },
    });

    res.json({ success: true, merchant: serialize(profile) });
  } catch (error: any) {
    console.error('[Merchant] Register error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to register' });
  }
});

// GET /api/merchant-portal/profile
router.get('/profile', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.json({ is_merchant: false });
    }

    res.json(serialize({
      ...profile,
      is_merchant: true,
    }));
  } catch (error: any) {
    console.error('[Merchant] Profile error:', error.message);
    res.json({ is_merchant: false });
  }
});

// PUT /api/merchant-portal/profile
router.put('/profile', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    const { business_name, description, category, address } = req.body;
    const updated = await prisma.merchant_profiles.update({
      where: { id: profile.id },
      data: {
        ...(business_name && { business_name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(address !== undefined && { address }),
      },
    });

    res.json({ success: true, profile: serialize(updated) });
  } catch (error: any) {
    console.error('[Merchant] Update error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// GET /api/merchant-portal/dashboard
router.get('/dashboard', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.json({ is_merchant: false });
    }

    const [inventoryCount, paymentCount, totalRevenue] = await Promise.all([
      prisma.merchant_inventories.count({ where: { merchant_profile_id: profile.id } }),
      prisma.merchant_payments.count({ where: { merchant_id: userId, status: 'paid' } }),
      prisma.merchant_payments.aggregate({
        where: { merchant_id: userId, status: 'paid' },
        _sum: { amount: true },
      }),
    ]);

    res.json(serialize({
      is_merchant: true,
      business_name: profile.business_name,
      verification_status: profile.verification_status,
      stats: {
        total_inventory: inventoryCount,
        total_payments: paymentCount,
        total_revenue: totalRevenue._sum.amount || 0,
      },
    }));
  } catch (error: any) {
    console.error('[Merchant] Dashboard error:', error.message);
    res.json([]);
  }
});

// GET /api/merchant-portal/vibe-history
router.get('/vibe-history', async (req: any, res) => {
  try {
    const lat = Number(req.query.lat) || 42.33;
    const lng = Number(req.query.lng) || -83.05;
    const days = Number(req.query.days) || 7;

    const history = await PromotionService.getVibeHistory(lat, lng, days);
    res.json(serialize(history));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch vibe history' });
  }
});

interface StoredMerchantPromotion {
  id: number;
  merchant_id: number;
  title: string;
  description: string | null;
  promo_code: string | null;
  discount_value: string;
  lat: number;
  lng: number;
  radius: number;
  token_cost: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function loadMerchantPromotions(merchantProfileId: bigint): Promise<StoredMerchantPromotion[]> {
  const key = `merchant_promotions_${merchantProfileId}`;
  const row = await prisma.autonomous_settings.findUnique({ where: { key } });
  if (!row || !row.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMerchantPromotions(merchantProfileId: bigint, promos: StoredMerchantPromotion[]) {
  const key = `merchant_promotions_${merchantProfileId}`;
  const value = JSON.stringify(promos);
  await prisma.autonomous_settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function getPromotionMetrics(promotionId: number) {
  const pid = BigInt(promotionId);
  const [views, clicks, redemptions] = await Promise.all([
    prisma.promotion_events.count({ where: { promotion_id: pid, type: 'view' } }),
    prisma.promotion_events.count({ where: { promotion_id: pid, type: 'click' } }),
    prisma.promotion_events.count({ where: { promotion_id: pid, type: 'redemption' } }),
  ]);
  const conversion_rate = views > 0 ? Number(((redemptions / views) * 100).toFixed(1)) : 0;
  return { views, clicks, redemptions, conversion_rate };
}

// GET /api/merchant-portal/promotions
// Returns `{ data: Promotion[], promos, vibe_context }` so `lib/api/merchant.ts`
// (`result.data || result`) receives a proper `Promotion[]` array instead of
// crashing `/merchant/promotions` on `(promotions || []).map is not a function`.
router.get('/promotions', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const lat = Number(req.query.lat) || 42.33;
    const lng = Number(req.query.lng) || -83.05;
    const profile = await getMerchantProfile(userId);

    const stored = profile ? await loadMerchantPromotions(profile.id) : [];
    const enriched = await Promise.all(
      stored.map(async (p) => {
        const metrics = await getPromotionMetrics(p.id);
        return { ...p, views: metrics.views, clicks: metrics.clicks, redemptions: metrics.redemptions };
      })
    );

    const promoEvents = await prisma.promotion_events.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const vibeMatch = await PromotionService.getVibeMatchedPromotions(lat, lng).catch(() => null);

    res.json(
      serialize({
        data: enriched,
        promos: promoEvents,
        vibe_context: vibeMatch,
      })
    );
  } catch (error: any) {
    console.error('[Merchant] Promotions error:', error.message);
    res.json({ data: [], promos: [], vibe_context: null });
  }
});

// POST /api/merchant-portal/promotions
router.post('/promotions', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const {
      title,
      description,
      promo_code,
      discount_value,
      lat,
      lng,
      radius,
      token_cost,
      starts_at,
      expires_at,
      promotion_id,
      type,
      metadata,
      broadcast_id,
    } = req.body || {};

    // Structured promotion creation from `/merchant/promotions/new`
    if (title) {
      let profile = await getMerchantProfile(userId);
      if (!profile) {
        profile = await prisma.merchant_profiles.create({
          data: {
            user_id: userId,
            business_name: 'FWBer Merchant',
            category: 'general',
            verification_status: 'pending',
          },
        });
      }

      const existing = await loadMerchantPromotions(profile.id);
      const nowIso = new Date().toISOString();
      const nextId = existing.reduce((max, p) => Math.max(max, Number(p.id) || 0), 1000) + 1;
      const newPromo: StoredMerchantPromotion = {
        id: nextId,
        merchant_id: Number(profile.id),
        title: String(title).trim(),
        description: description ? String(description) : null,
        promo_code: promo_code ? String(promo_code).trim() : null,
        discount_value: String(discount_value || '10% OFF'),
        lat: Number(lat) || 42.3314,
        lng: Number(lng) || -83.0458,
        radius: Number(radius) || 5000,
        token_cost: Number(token_cost) || 0,
        starts_at: starts_at ? String(starts_at) : nowIso,
        expires_at: expires_at ? String(expires_at) : new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      };

      existing.unshift(newPromo);
      await saveMerchantPromotions(profile.id, existing);

      return res.status(201).json({ success: true, promotion: newPromo, data: newPromo });
    }

    // Legacy promotion event telemetry fallback
    const finalMetadata = {
      ...(metadata || {}),
      ...(broadcast_id && { attributed_broadcast_id: broadcast_id }),
    };

    const promo = await prisma.promotion_events.create({
      data: {
        promotion_id: promotion_id ? BigInt(promotion_id) : BigInt(0),
        user_id: userId,
        type: type || 'view',
        metadata: finalMetadata,
      },
    });

    res.json({ success: true, promotion: serialize(promo) });
  } catch (error: any) {
    console.error('[Merchant] Create promo error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create promotion' });
  }
});

// GET /api/merchant-portal/promotions/:id
router.get('/promotions/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);
    if (!profile) return res.status(404).json({ message: 'Merchant profile not found' });

    const promoId = Number(req.params.id);
    const promos = await loadMerchantPromotions(profile.id);
    const promo = promos.find((p) => Number(p.id) === promoId);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });

    const metrics = await getPromotionMetrics(promo.id);
    return res.json({
      promotion: { ...promo, views: metrics.views, clicks: metrics.clicks, redemptions: metrics.redemptions },
      metrics,
    });
  } catch (error: any) {
    console.error('[Merchant] Get promo detail error:', error.message);
    return res.status(500).json({ message: 'Failed to load promotion' });
  }
});

// PUT /api/merchant-portal/promotions/:id
router.put('/promotions/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);
    if (!profile) return res.status(404).json({ message: 'Merchant profile not found' });

    const promoId = Number(req.params.id);
    const promos = await loadMerchantPromotions(profile.id);
    const idx = promos.findIndex((p) => Number(p.id) === promoId);
    const current = idx >= 0 ? promos[idx] : undefined;
    if (!current) return res.status(404).json({ message: 'Promotion not found' });

    const body = req.body || {};
    const updated: StoredMerchantPromotion = {
      ...current,
      ...(body.title !== undefined && { title: String(body.title) }),
      ...(body.description !== undefined && { description: body.description ? String(body.description) : null }),
      ...(body.promo_code !== undefined && { promo_code: body.promo_code ? String(body.promo_code) : null }),
      ...(body.discount_value !== undefined && { discount_value: String(body.discount_value) }),
      ...(body.radius !== undefined && { radius: Number(body.radius) }),
      ...(body.token_cost !== undefined && { token_cost: Number(body.token_cost) }),
      ...(body.starts_at !== undefined && { starts_at: String(body.starts_at) }),
      ...(body.expires_at !== undefined && { expires_at: String(body.expires_at) }),
      ...(body.is_active !== undefined && { is_active: Boolean(body.is_active) }),
      updated_at: new Date().toISOString(),
    };

    promos[idx] = updated;
    await saveMerchantPromotions(profile.id, promos);
    return res.json({ success: true, promotion: updated, data: updated });
  } catch (error: any) {
    console.error('[Merchant] Update promo error:', error.message);
    return res.status(500).json({ message: 'Failed to update promotion' });
  }
});

// DELETE /api/merchant-portal/promotions/:id
router.delete('/promotions/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);
    if (!profile) return res.status(404).json({ message: 'Merchant profile not found' });

    const promoId = Number(req.params.id);
    const promos = await loadMerchantPromotions(profile.id);
    const target = promos.find((p) => Number(p.id) === promoId);
    if (!target) return res.status(404).json({ message: 'Promotion not found' });

    const remaining = promos.filter((p) => Number(p.id) !== promoId);
    await saveMerchantPromotions(profile.id, remaining);
    return res.json({ success: true, promotion: target });
  } catch (error: any) {
    console.error('[Merchant] Delete promo error:', error.message);
    return res.status(500).json({ message: 'Failed to delete promotion' });
  }
});

// GET /api/merchant-portal/analytics
router.get('/analytics', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.json({ kpis: { kFactor: 0, totalReach: 0, conversionRate: 0, totalRevenue: 0, revenueChange: 0 }, retention: [], promotions: [], broadcasts: [] });
    }

    const [totalViews, totalClicks, totalRedemptions, totalRevenue] = await Promise.all([
      prisma.promotion_events.count({ where: { user_id: userId, type: 'view' } }),
      prisma.promotion_events.count({ where: { user_id: userId, type: 'click' } }),
      prisma.promotion_events.count({ where: { user_id: userId, type: 'redemption' } }),
      prisma.merchant_payments.aggregate({
        where: { merchant_id: userId, status: 'paid' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      kpis: {
        kFactor: totalViews > 0 ? Number((totalRedemptions / totalViews).toFixed(2)) : 0,
        totalReach: totalViews,
        conversionRate: totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        revenueChange: 0,
        vibeAlignment: 85, // Simulated KPI for vibe-matched performance
      },
      retention: [],
      promotions: [],
      broadcasts: [],
    });
  } catch (error: any) {
    console.error('[Merchant] Analytics error:', error.message);
    res.json({ kpis: { kFactor: 0, totalReach: 0, conversionRate: 0, totalRevenue: 0, revenueChange: 0 }, retention: [], promotions: [], broadcasts: [] });
  }
});

/**
 * GET /api/merchant-portal/analytics/export — CSV report export (`app/merchant/analytics/page.tsx`).
 */
router.get('/analytics/export', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const range = String(req.query.range || '7d').replace(/[^a-zA-Z0-9_-]/g, '') || '7d';
    const profile = await getMerchantProfile(userId);
    const promos = profile ? await loadMerchantPromotions(profile.id) : [];

    const [totalViews, totalClicks, totalRedemptions, totalRevenue] = await Promise.all([
      prisma.promotion_events.count({ where: { user_id: userId, type: 'view' } }),
      prisma.promotion_events.count({ where: { user_id: userId, type: 'click' } }),
      prisma.promotion_events.count({ where: { user_id: userId, type: 'redemption' } }),
      prisma.merchant_payments.aggregate({
        where: { merchant_id: userId, status: 'paid' },
        _sum: { amount: true },
      }),
    ]);

    const csvEscape = (val: unknown) => {
      const s = String(val ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows: string[] = [
      'Section,Metric_or_Title,Views,Clicks,Redemptions,Conversion_Pct,Revenue_USD,Status',
      [
        'KPI_SUMMARY',
        csvEscape(`${profile?.business_name || 'Merchant'} (${range})`),
        totalViews,
        totalClicks,
        totalRedemptions,
        totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0',
        Number(totalRevenue._sum.amount || 0).toFixed(2),
        profile?.verification_status || 'unregistered',
      ].join(','),
    ];

    for (const promo of promos) {
      const m = await getPromotionMetrics(promo.id);
      rows.push(
        [
          'PROMOTION',
          csvEscape(promo.title),
          m.views,
          m.clicks,
          m.redemptions,
          m.conversion_rate.toFixed(1),
          '0.00',
          promo.is_active ? 'active' : 'paused',
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fwber_merchant_report_${range}.csv"`);
    return res.send(rows.join('\n') + '\n');
  } catch (error: any) {
    console.error('[Merchant] Analytics CSV export error:', error.message);
    return res.status(500).json({ error: 'Failed to export merchant analytics CSV' });
  }
});

// GET /api/merchant-portal/inventory
router.get('/inventory', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.json({ items: [] });
    }

    const items = await prisma.merchant_inventories.findMany({
      where: { merchant_profile_id: profile.id, is_available: true },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      items: serialize(items.map((item: any) => ({
        ...item,
        price_usd: Number(item.price_usd),
        price_tokens: Number(item.price_usd),
        stock_count: Number(item.stock_count),
      }))),
    });
  } catch (error: any) {
    console.error('[Merchant] Inventory error:', error.message);
    res.json({ items: [] });
  }
});

// POST /api/merchant-portal/inventory
// Accepts either `price_usd` or `price_tokens` (`app/merchant/inventory/page.tsx`
// submits `price_tokens`, which matches `marketplace.ts`'s 1:1 token-display mapping).
router.post('/inventory', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.status(403).json({ message: 'Not a merchant — register at /merchant/register first' });
    }

    const { name, description, price_usd, price_tokens, stock_count, image_url } = req.body || {};
    const resolvedPrice = price_usd !== undefined && price_usd !== ''
      ? Number(price_usd)
      : (price_tokens !== undefined && price_tokens !== '' ? Number(price_tokens) : NaN);

    if (!name || !String(name).trim() || !Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
      return res.status(400).json({ message: 'name and a positive price_tokens (or price_usd) are required' });
    }

    const now = new Date();
    const item = await prisma.merchant_inventories.create({
      data: {
        merchant_profile_id: profile.id,
        name: String(name).trim().slice(0, 255),
        description: description ? String(description).trim() : null,
        price_usd: resolvedPrice,
        stock_count: Math.max(0, Number(stock_count) || 0),
        image_url: image_url ? String(image_url).trim() : null,
        is_available: true,
        created_at: now,
        updated_at: now,
      },
    });

    const serialized = serialize(item);
    res.status(201).json({
      item: {
        ...serialized,
        price_usd: Number(item.price_usd),
        price_tokens: Number(item.price_usd),
        stock_count: Number(item.stock_count),
      },
    });
  } catch (error: any) {
    console.error('[Merchant] Inventory create error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create inventory item' });
  }
});

// DELETE /api/merchant-portal/inventory/:id — Remove or archive a merchant inventory item (`app/merchant/inventory/page.tsx`)
router.delete('/inventory/:id', async (req: any, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ message: 'Invalid inventory item ID' });
    }
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);
    if (!profile) {
      return res.status(403).json({ message: 'Not a merchant' });
    }

    const itemId = BigInt(req.params.id);
    const item = await prisma.merchant_inventories.findUnique({
      where: { id: itemId },
    });
    if (!item || item.merchant_profile_id !== profile.id) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const redemptionsCount = await prisma.inventory_redemptions.count({
      where: { merchant_inventory_id: itemId },
    }).catch(() => 0);

    if (redemptionsCount > 0) {
      await prisma.merchant_inventories.update({
        where: { id: itemId },
        data: { is_available: false, stock_count: 0, updated_at: new Date() },
      });
    } else {
      await prisma.merchant_inventories.delete({ where: { id: itemId } });
    }

    return res.json({ success: true, id: Number(itemId) });
  } catch (error: any) {
    console.error('[Merchant] Inventory delete error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete inventory item' });
  }
});

// POST /api/merchant-portal/inventory/redeem
router.post('/inventory/redeem', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);
    if (!profile) {
      return res.status(403).json({ message: 'Not a merchant' });
    }

    const rawCode = String(req.body?.code || '').trim();
    if (!rawCode) {
      return res.status(400).json({ message: 'Redemption code required' });
    }

    const whereClause = /^\d+$/.test(rawCode)
      ? { OR: [{ redemption_code: rawCode }, { id: BigInt(rawCode) }] }
      : { redemption_code: rawCode.toUpperCase() };

    const redemption = await prisma.inventory_redemptions.findFirst({
      where: whereClause,
      include: {
        merchant_inventories: true,
        users: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true } },
          },
        },
      },
    });

    if (!redemption || redemption.merchant_inventories?.merchant_profile_id !== profile.id) {
      return res.status(404).json({ message: 'Invalid redemption code' });
    }

    if (redemption.redeemed_at) {
      return res.status(409).json({ message: 'Redemption code has already been used' });
    }

    const now = new Date();
    const updated = await prisma.inventory_redemptions.update({
      where: { id: redemption.id },
      data: { redeemed_at: now, updated_at: now },
    });

    const buyer = redemption.users as any;
    const buyerProfile = Array.isArray(buyer?.user_profiles) ? buyer.user_profiles[0] : buyer?.user_profiles;

    return res.json({
      success: true,
      item_name: redemption.merchant_inventories?.name || 'Marketplace Item',
      user_name: buyerProfile?.display_name || buyer?.name || 'Customer',
      redeemed: serialize(updated),
    });
  } catch (error: any) {
    console.error('[Merchant] Redeem error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to redeem' });
  }
});

// GET /api/merchant-portal/loyalty/settings
router.get('/loyalty/settings', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.status(403).json({ message: 'Not a merchant' });
    }

    const key = `loyalty_settings_merchant_${profile.id}`;
    const settings = await prisma.autonomous_settings.findUnique({
      where: { key },
    });

    if (!settings) {
      return res.json({
        enabled: true,
        checkin_threshold: 5,
        nft_collection_name: 'Merchant Vibe Gold',
      });
    }

    res.json(JSON.parse(settings.value));
  } catch (error: any) {
    console.error('[Merchant] Loyalty settings error:', error.message);
    res.status(500).json({ message: 'Failed to fetch loyalty settings' });
  }
});

// POST /api/merchant-portal/loyalty/settings
router.post('/loyalty/settings', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await getMerchantProfile(userId);

    if (!profile) {
      return res.status(403).json({ message: 'Not a merchant' });
    }

    const key = `loyalty_settings_merchant_${profile.id}`;
    const value = JSON.stringify(req.body);

    await prisma.autonomous_settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Merchant] Loyalty settings save error:', error.message);
    res.status(500).json({ message: 'Failed to save loyalty settings' });
  }
});

export default router;
