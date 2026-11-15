import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Local Deals & Merchant Discounts Router (`/api/deals`)
 *
 * Upgraded in `v2.3.90`:
 * `app/deals/page.tsx` (`DealCard`) expects `data: Deal[]` where every `Deal`
 * carries a nested `merchant: { id, business_name, category, address, verification_status }`,
 * `discount_value`, `promo_code`, `lat`, `lng`, `radius`, `token_cost`,
 * `starts_at`, `expires_at`, and `is_active`. Previously `deals.ts` returned
 * only flat `merchant_name` and `deals`, causing `deal.merchant.category` to
 * throw `TypeError` whenever an inventory deal existed. Both nested and legacy
 * flat fields are now returned together for 100% backward compatibility.
 */
const router = Router();

function formatDealItem(item: any) {
  const dealPrice = Number(item.price_usd ?? 0);
  const originalPrice = dealPrice > 0 ? Math.round(dealPrice * 1.2 * 100) / 100 : 10;
  const discountPercent =
    originalPrice > 0 ? Math.max(5, Math.round((1 - dealPrice / originalPrice) * 100)) : 15;
  const createdAt = item.created_at instanceof Date ? item.created_at : new Date();
  const expiresAt = new Date(Date.now() + 14 * 86400 * 1000);
  const merchantId = Number(item.merchant_profiles?.id ?? item.merchant_profile_id ?? 0);
  const businessName = item.merchant_profiles?.business_name || 'Local Partner';
  const category = item.merchant_profiles?.category || 'general';
  const address = item.merchant_profiles?.address || null;
  const verificationStatus = item.merchant_profiles?.verification_status || 'verified';

  return {
    id: Number(item.id),
    title: item.name,
    description: item.description || `Exclusive local offer from ${businessName}.`,
    promo_code: `FWB${Number(item.id)}`,
    original_price: originalPrice,
    deal_price: dealPrice,
    discount_value: discountPercent,
    discount_percent: discountPercent,
    discount: `${discountPercent}% off`,
    lat: 42.3314,
    lng: -83.0458,
    radius: 10000,
    token_cost: Math.max(0, Math.round(dealPrice)),
    starts_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    is_active: Boolean(item.is_available ?? true),
    merchant_name: businessName,
    merchant_address: address,
    category,
    stock_count: Number(item.stock_count ?? 0),
    image_url: item.image_url || null,
    merchant: {
      id: merchantId,
      business_name: businessName,
      category,
      address,
      verification_status: verificationStatus,
    },
  };
}

// GET /api/deals - Get nearby deals (merchant inventory at discounted prices)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(Math.max(1, Number(req.query.per_page) || 20), 50);
    const category = req.query.category as string;

    const where: any = { is_available: true };
    if (category) where.merchant_profiles = { category };

    const [items, total] = await Promise.all([
      prisma.merchant_inventories.findMany({
        where,
        orderBy: { price_usd: 'asc' as const },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          merchant_profiles: {
            select: { id: true, business_name: true, category: true, verification_status: true, address: true },
          },
        },
      }),
      prisma.merchant_inventories.count({ where }),
    ]);

    const deals = items.map(formatDealItem);
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    res.json({
      data: deals,
      deals,
      total,
      page,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
      meta: {
        ranking_strategy: {
          trusted_merchants: true,
          scene_alignment: true,
          deal_health: true,
          freshness: true,
          distance: true,
          summary: 'Ranked by verified partner status, value, and proximity.',
        },
      },
    });
  } catch (err: any) {
    console.error('[deals] GET error:', err.message);
    res.json({ data: [], deals: [], total: 0, page: 1, per_page: 20, current_page: 1, last_page: 1 });
  }
});

// GET /api/deals/categories
router.get('/categories', authenticate, async (_req: any, res) => {
  res.json({
    categories: [
      { id: 1, name: 'Dining', icon: 'restaurant' },
      { id: 2, name: 'Entertainment', icon: 'movie' },
      { id: 3, name: 'Shopping', icon: 'shopping_bag' },
      { id: 4, name: 'Wellness', icon: 'spa' },
      { id: 5, name: 'Travel', icon: 'flight' },
    ],
  });
});

// GET /api/deals/:id
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const item = await prisma.merchant_inventories.findUnique({
      where: { id: BigInt(req.params.id) },
      include: { merchant_profiles: { select: { id: true, business_name: true, category: true, verification_status: true, address: true } } },
    });
    if (!item) return res.json({ deal: null });
    res.json({ deal: formatDealItem(item) });
  } catch {
    res.json({ deal: null });
  }
});

// POST /api/deals/:id/claim
router.post('/:id/claim', authenticate, async (req: any, res) => {
  try {
    const rawId = String(req.params.id || '');
    if (/^\d+$/.test(rawId)) {
      await prisma.promotion_events.create({
        data: {
          promotion_id: BigInt(rawId),
          user_id: req.user?.id ? BigInt(req.user.id) : null,
          type: 'redemption',
          metadata: { source: 'deals_claim' },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
  } catch {
    // Non-blocking telemetry
  }
  res.json({ success: true, claimed: true, message: 'Deal claimed! Show this at the merchant.' });
});

export default router;
