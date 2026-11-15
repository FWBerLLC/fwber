import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Helper to serialize inventory items
const serializeItem = (item: any) => ({
  id: Number(item.id),
  merchant_profile_id: Number(item.merchant_profile_id),
  name: item.name,
  description: item.description,
  price_tokens: Number(item.price_usd || 0), // Using USD price as token equivalent (1 FWB ≈ $0.01)
  price_usd: Number(item.price_usd || 0),
  stock_count: Number(item.stock_count),
  image_url: item.image_url,
  is_available: item.is_available ?? true,
  merchant_name: item.merchant_profiles?.business_name || 'Unknown',
  merchant_category: item.merchant_profiles?.category || 'general',
  merchant_verified: item.merchant_profiles?.verification_status === 'approved',
});

// GET /api/marketplace — root list (alias for /items)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const where: any = { is_available: true };
    const category = req.query.category as string;
    if (category) where.merchant_profiles = { category };

    const [items, total] = await Promise.all([
      prisma.merchant_inventories.findMany({
        where,
        orderBy: { created_at: 'desc' as const },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          merchant_profiles: {
            select: { id: true, business_name: true, category: true, verification_status: true, description: true }
          }
        }
      }),
      prisma.merchant_inventories.count({ where })
    ]);

    res.json({ items: items.map(serializeItem), total, page, limit });
  } catch (err: any) {
    console.error('[marketplace] list error:', err.message);
    res.json({ items: [], total: 0, page: 1, limit: 20 });
  }
});

// GET /api/marketplace/nearby — nearby marketplace items
router.get('/nearby', authenticate, async (req: any, res) => {
  try {
    const lat = Number(req.query.lat) || 42.33;
    const lng = Number(req.query.lng) || -83.05;
    const radiusM = Number(req.query.radius_m) || 50000;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const category = req.query.category as string;
    const where: any = { is_available: true };
    if (category) where.merchant_profiles = { category };

    const items = await prisma.merchant_inventories.findMany({
      where,
      orderBy: { created_at: 'desc' as const },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        merchant_profiles: {
          select: { id: true, business_name: true, category: true, verification_status: true, description: true }
          // Note: merchant_profiles.latitude/longitude could be used for distance filtering
          // but for now we return all available items with the radius context
        }
      }
    });
    const total = await prisma.merchant_inventories.count({ where });

    res.json({
      items: items.map(serializeItem),
      total, page, limit,
      center: { lat, lng },
      radius_m: radiusM,
    });
  } catch (err: any) {
    console.error('[marketplace] nearby error:', err.message);
    res.json({ items: [], total: 0, page: 1, limit: 20, radius_m: 5000 });
  }
});

// GET /api/marketplace/items
router.get('/items', authenticate, async (req: any, res) => {
  try {
    const items = await prisma.merchant_inventories.findMany({
      where: { is_available: true },
      orderBy: { created_at: 'desc' as const },
      take: 20,
      include: {
        merchant_profiles: {
          select: { id: true, business_name: true, category: true, verification_status: true }
        }
      }
    });
    res.json({ items: items.map(serializeItem) });
  } catch (err: any) {
    console.error('[marketplace] items error:', err.message);
    res.json({ items: [] });
  }
});

// GET /api/marketplace/categories
router.get('/categories', authenticate, async (_req: any, res) => {
  try {
    const cats = await prisma.merchant_profiles.findMany({
      where: { verification_status: 'approved' },
      select: { category: true },
      distinct: ['category']
    });
    res.json({ categories: cats.map((c: any) => c.category).filter(Boolean) });
  } catch (_e) {
    res.json({ categories: ['food', 'retail', 'entertainment', 'services'] });
  }
});

// GET /api/marketplace/:merchantId — get inventory for a specific merchant
router.get('/:merchantId', authenticate, async (req: any, res) => {
  try {
    const merchantId = BigInt(req.params.merchantId);
    const merchant = await prisma.merchant_profiles.findUnique({
      where: { id: merchantId },
      include: { users: { select: { id: true, name: true } } }
    });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const items = await prisma.merchant_inventories.findMany({
      where: { merchant_profile_id: merchantId, is_available: true },
      orderBy: { created_at: 'desc' as const },
    });

    res.json({
      merchant: {
        id: Number(merchant.id),
        business_name: merchant.business_name,
        category: merchant.category,
        description: merchant.description,
        verification_status: merchant.verification_status,
        owner_name: (merchant.users as any)?.name || 'Unknown',
      },
      items: items.map(serializeItem),
    });
  } catch (err: any) {
    console.error('[marketplace] merchant lookup error:', err.message);
    res.json({ merchant: null, items: [] });
  }
});

// POST /api/marketplace/items
router.post('/items', authenticate, async (req: any, res) => {
  res.json({ message: 'Item creation requires merchant approval' });
});

// POST /api/marketplace/purchase/:itemId — purchase an item with FWB tokens
router.post('/purchase/:itemId', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const itemId = BigInt(req.params.itemId);

    const item = await prisma.merchant_inventories.findUnique({
      where: { id: itemId },
      include: { merchant_profiles: { select: { id: true, business_name: true } } }
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (!item.is_available) return res.status(400).json({ error: 'Item not available' });
    if (item.stock_count <= 0) return res.status(400).json({ error: 'Item out of stock' });

    const price = Number(item.price_usd || 0);

    // Check user balance
    const user = await prisma.users.findUnique({ where: { id: userId } });
    const balance = Number(user?.token_balance || 0);
    if (balance < price) return res.status(400).json({ error: 'Insufficient FWB tokens', balance, price });

    // Generate redemption code and persist in `inventory_redemptions` so Merchant POS
    // (`POST /api/merchant-portal/inventory/redeem`) can verify and redeem it once.
    const redemptionCode = `FWB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date();

    // Deduct tokens, decrement stock, record ledger entry, and persist redemption voucher atomically
    await prisma.$transaction([
      prisma.users.update({
        where: { id: userId },
        data: { token_balance: { decrement: price } }
      }),
      prisma.merchant_inventories.update({
        where: { id: itemId },
        data: { stock_count: { decrement: 1 } }
      }),
      prisma.wallet_transactions.create({
        data: {
          user_id: userId,
          type: 'purchase',
          amount: -price,
          description: `Purchased ${item.name} from ${item.merchant_profiles?.business_name || 'merchant'}`,
          created_at: now,
        }
      }),
      prisma.inventory_redemptions.create({
        data: {
          user_id: userId,
          merchant_inventory_id: itemId,
          redemption_code: redemptionCode,
          created_at: now,
          updated_at: now,
        }
      }),
    ]);

    res.json({
      message: 'Purchase successful!',
      redemption_code: redemptionCode,
      item_name: item.name,
      price_tokens: price,
      remaining_balance: balance - price,
    });
  } catch (err: any) {
    console.error('[marketplace] purchase error:', err.message);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

export default router;
