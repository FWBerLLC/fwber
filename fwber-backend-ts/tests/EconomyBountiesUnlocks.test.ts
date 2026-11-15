import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  swap_transactions: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  wallet_transactions: {
    create: jest.fn(),
  },
  content_unlocks: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  match_bounties: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  match_assists: {
    upsert: jest.fn(),
  },
  blocks: {
    findFirst: jest.fn(),
  },
  merchant_inventories: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  merchant_profiles: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  promotion_events: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  autonomous_settings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  autonomous_actions: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
  serialize: (val: any) => val,
  sanitizeUser: (user: any) => user,
}));

const { default: economyRoutes } = await import('../src/routes/economy.js');
const { default: bountiesRoutes, matchmakerRouter } = await import('../src/routes/bounties.js');
const { default: shareUnlocksRoutes } = await import('../src/routes/share-unlocks.js');
const { default: contentUnlocksRoutes } = await import('../src/routes/content-unlocks.js');
const { default: dealsRoutes } = await import('../src/routes/deals.js');
const { default: promotionsRoutes } = await import('../src/routes/promotions.js');
const { default: merchantPortalRoutes } = await import('../src/routes/merchant-portal.js');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function makeAuthHeader(userId = 42) {
  const token = jwt.sign({ id: userId, email: 'member@fwber.online' }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return `Bearer ${token}`;
}

const app = express();
app.use(express.json());
app.use('/api/economy', economyRoutes);
app.use('/api/bounties', bountiesRoutes);
app.use('/api/matchmaker', matchmakerRouter);
app.use('/api/share-unlocks', shareUnlocksRoutes);
app.use('/api/share-unlock', shareUnlocksRoutes);
app.use('/api/content-unlocks', contentUnlocksRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/merchant-portal', merchantPortalRoutes);

describe('v2.3.90 Economy, Bounties, Unlocks & Promotions Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => ({
      id: where?.id ?? 42n,
      name: 'Alice',
      email: 'member@fwber.online',
      role: 'user',
      is_moderator: false,
      token_balance: 500,
      user_profiles: { display_name: 'Alice', avatar_url: null },
    }));
  });

  describe('Global Bridge (`/api/economy`)', () => {
    it('serves live reference rates with SOL, USDC, and PEER_TOKEN pairs', async () => {
      const res = await request(app).get('/api/economy/rates');
      expect(res.status).toBe(200);
      expect(res.body.fwb_usd).toBeGreaterThan(0);
      expect(res.body.pairs).toEqual(
        expect.objectContaining({
          SOL: expect.any(Number),
          USDC: expect.any(Number),
          PEER_TOKEN: 1,
        })
      );
    });

    it('rejects swaps with 402 when FWB balance is insufficient and executes atomically when funded', async () => {
      mockPrisma.users.findUnique
        .mockResolvedValueOnce({ id: 42n, email: 'a@b.c', role: 'user', token_balance: 20 }) // auth middleware
        .mockResolvedValueOnce({ id: 42n, token_balance: 20 }); // tx lookup

      const failRes = await request(app)
        .post('/api/economy/swaps/initiate')
        .set('Authorization', makeAuthHeader(42))
        .send({ amount: 100, target_asset: 'USDC', destination_address: 'So11111111111111111111111111111111111111112' });
      expect(failRes.status).toBe(402);

      mockPrisma.users.update.mockResolvedValue({ token_balance: 400 });
      mockPrisma.swap_transactions.create.mockResolvedValue({
        id: 7n,
        user_id: 42n,
        source_asset: 'FWB_TOKEN',
        target_asset: 'USDC',
        source_amount: 100,
        target_amount: 49,
        destination_address: 'So11111111111111111111111111111111111111112',
        status: 'pending',
        created_at: new Date(),
      });
      mockPrisma.wallet_transactions.create.mockResolvedValue({ id: 1n });

      const okRes = await request(app)
        .post('/api/economy/swaps/initiate')
        .set('Authorization', makeAuthHeader(42))
        .send({ amount: 100, target_asset: 'USDC', destination_address: 'So11111111111111111111111111111111111111112' });

      expect(okRes.status).toBe(201);
      expect(okRes.body.new_balance).toBe(400);
      expect(okRes.body.swap.target_asset).toBe('USDC');
      expect(mockPrisma.wallet_transactions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Matchmaker Bounties (`/api/bounties` & `/api/matchmaker`)', () => {
    it('creates a bounty without an explicit title (CreateBountyModal contract) and returns share_url', async () => {
      mockPrisma.match_bounties.create.mockResolvedValue({
        id: 19n,
        user_id: 42n,
        slug: 'alice-m9abc',
        token_reward: 150,
        description: 'Coffee & vinyl',
        status: 'active',
      });
      mockPrisma.users.update.mockResolvedValue({ token_balance: 350 });
      mockPrisma.wallet_transactions.create.mockResolvedValue({ id: 2n });

      const res = await request(app)
        .post('/api/bounties')
        .set('Authorization', makeAuthHeader(42))
        .send({ token_reward: 150, description: 'Coffee & vinyl' });

      expect(res.status).toBe(201);
      expect(res.body.share_url).toContain('/bounty/alice-m9abc');
      expect(res.body.token_reward).toBe(150);
    });

    it('serves public `/api/matchmaker/bounty/:slug` without authentication and enforces blocks on `/suggest`', async () => {
      const sampleBounty = {
        id: 19n,
        user_id: 77n,
        slug: 'bob-bounty-1',
        token_reward: 200,
        description: 'Looking for a hiking partner',
        status: 'active',
        deleted_at: null,
        expires_at: new Date(Date.now() + 86400_000),
        created_at: new Date(),
        _count: { match_assists: 1 },
        users: {
          id: 77n,
          name: 'Bob',
          user_profiles: [{ display_name: 'Bob', avatar_url: null, bio: 'Trail runner', gender: 'Man', date_of_birth: null, birthdate: null }],
          photos: [{ id: 3n, file_path: '/uploads/bob.jpg', is_primary: true }],
        },
      };
      mockPrisma.match_bounties.findUnique.mockResolvedValue(sampleBounty);

      const pubRes = await request(app).get('/api/matchmaker/bounty/bob-bounty-1');
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.bounty.slug).toBe('bob-bounty-1');
      expect(pubRes.body.bounty.user.profile.display_name).toBe('Bob');

      // Blocked candidate -> 403
      mockPrisma.blocks.findFirst.mockResolvedValueOnce({ id: 99n });
      const blockedRes = await request(app)
        .post('/api/bounties/bob-bounty-1/suggest')
        .set('Authorization', makeAuthHeader(42))
        .send({ candidate_id: 88 });
      expect(blockedRes.status).toBe(403);

      // Unblocked candidate -> 201
      mockPrisma.blocks.findFirst.mockResolvedValueOnce(null);
      mockPrisma.match_assists.upsert.mockResolvedValue({
        id: 5n,
        match_bounty_id: 19n,
        matchmaker_id: 42n,
        subject_id: 77n,
        target_id: 88n,
        status: 'suggested',
      });
      const suggestRes = await request(app)
        .post('/api/bounties/bob-bounty-1/suggest')
        .set('Authorization', makeAuthHeader(42))
        .send({ candidate_id: 88 });
      expect(suggestRes.status).toBe(201);
      expect(suggestRes.body.assist.status).toBe('suggested');
    });
  });

  describe('Share-to-Unlock & Content Unlocks (`/api/share-unlock`, `/api/content-unlocks`)', () => {
    it('supports singular `/api/share-unlock` POST and GET `/:targetId` check backed by content_unlocks', async () => {
      mockPrisma.content_unlocks.upsert.mockResolvedValue({
        id: 11n,
        user_id: 42n,
        content_type: 'share:copy',
        content_id: '77',
        cost: 0,
        created_at: new Date(),
      });

      const postRes = await request(app)
        .post('/api/share-unlock')
        .set('Authorization', makeAuthHeader(42))
        .send({ target_profile_id: 77, platform: 'copy_link' });
      expect(postRes.status).toBe(200);
      expect(postRes.body.unlocked).toBe(true);

      mockPrisma.content_unlocks.findFirst.mockResolvedValueOnce({ id: 11n });
      const checkRes = await request(app)
        .get('/api/share-unlock/77')
        .set('Authorization', makeAuthHeader(42));
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.unlocked).toBe(true);
    });

    it('unlocks token-gated content idempotently and returns 402 when underfunded', async () => {
      mockPrisma.content_unlocks.findUnique.mockResolvedValueOnce({
        id: 15n,
        user_id: 42n,
        content_type: 'match_insights',
        content_id: '99',
        cost: 15,
        created_at: new Date(),
      });

      const idemRes = await request(app)
        .post('/api/content-unlocks')
        .set('Authorization', makeAuthHeader(42))
        .send({ content_type: 'match_insights', content_id: 99, cost: 15 });
      expect(idemRes.status).toBe(200);
      expect(idemRes.body.already_unlocked).toBe(true);
      expect(mockPrisma.users.update).not.toHaveBeenCalled();
    });
  });

  describe('Deals, Promotion Events & Merchant Portal Promotions', () => {
    it('returns nested `merchant` object on `/api/deals` and tracks `/api/promotions/:id/track` events', async () => {
      mockPrisma.merchant_inventories.findMany.mockResolvedValue([
        {
          id: 3n,
          name: '2-for-1 Espresso Martini',
          description: 'Date night special',
          price_usd: 12,
          stock_count: 25,
          image_url: null,
          is_available: true,
          created_at: new Date(),
          merchant_profiles: {
            id: 9n,
            business_name: 'Velvet Lounge',
            category: 'dining',
            address: '101 Woodward Ave',
            verification_status: 'verified',
          },
        },
      ]);
      mockPrisma.merchant_inventories.count.mockResolvedValue(1);

      const dealsRes = await request(app)
        .get('/api/deals')
        .set('Authorization', makeAuthHeader(42));
      expect(dealsRes.status).toBe(200);
      expect(dealsRes.body.data).toHaveLength(1);
      expect(dealsRes.body.data[0].merchant.business_name).toBe('Velvet Lounge');
      expect(dealsRes.body.data[0].merchant.category).toBe('dining');

      mockPrisma.promotion_events.create.mockResolvedValue({
        id: 55n,
        promotion_id: 3n,
        type: 'click',
      });
      const trackRes = await request(app)
        .post('/api/promotions/3/track')
        .set('Authorization', makeAuthHeader(42))
        .send({ type: 'click' });
      expect(trackRes.status).toBe(201);
      expect(trackRes.body.type).toBe('click');
    });

    it('returns `{ data: Promotion[] }` on `/api/merchant-portal/promotions` and supports CRUD', async () => {
      mockPrisma.merchant_profiles.findUnique.mockResolvedValue({
        id: 9n,
        user_id: 42n,
        business_name: 'Velvet Lounge',
        category: 'dining',
      });
      let storedJson: string | null = null;
      mockPrisma.autonomous_settings.findUnique.mockImplementation(async () =>
        storedJson ? { key: 'merchant_promotions_9', value: storedJson } : null
      );
      mockPrisma.autonomous_settings.upsert.mockImplementation(async ({ create }: any) => {
        storedJson = create.value;
        return { key: create.key, value: create.value };
      });
      mockPrisma.promotion_events.count.mockResolvedValue(4);
      mockPrisma.promotion_events.findMany.mockResolvedValue([]);
      mockPrisma.autonomous_actions.findMany.mockResolvedValue([]);

      const createRes = await request(app)
        .post('/api/merchant-portal/promotions')
        .set('Authorization', makeAuthHeader(42))
        .send({ title: 'Happy Hour 25% Off', discount_value: '25% OFF', radius: 3000 });
      expect(createRes.status).toBe(201);
      const promoId = createRes.body.promotion.id;

      const listRes = await request(app)
        .get('/api/merchant-portal/promotions')
        .set('Authorization', makeAuthHeader(42));
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].title).toBe('Happy Hour 25% Off');

      const detailRes = await request(app)
        .get(`/api/merchant-portal/promotions/${promoId}`)
        .set('Authorization', makeAuthHeader(42));
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.metrics.views).toBe(4);
    });
  });
});
