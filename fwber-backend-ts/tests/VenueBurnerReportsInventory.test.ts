import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const pushedSocketEvents: Array<{ userId: number; event: string; data: any }> = [];

// In-memory stores for deterministic end-to-end route verification
const usersMap = new Map<number, any>();
const venuesMap = new Map<number, any>();
const venueCheckinsList: any[] = [];
const burnerLinksMap = new Map<number, any>();
const chatroomsMap = new Map<number, any>();
const chatroomMembersList: any[] = [];
const reportsMap = new Map<number, any>();
const merchantProfilesMap = new Map<number, any>();
const merchantInventoriesMap = new Map<number, any>();
const inventoryRedemptionsList: any[] = [];

let nextId = 100;

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(async ({ where }: any) => {
      const u = usersMap.get(Number(where.id));
      return u || null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const u = usersMap.get(Number(where.id));
      if (!u) throw new Error('User not found');
      if (data.token_balance?.decrement) {
        u.token_balance = Number(u.token_balance || 0) - Number(data.token_balance.decrement);
      }
      return u;
    }),
  },
  venues: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id !== undefined) return venuesMap.get(Number(where.id)) || null;
      if (where.email !== undefined) {
        for (const v of venuesMap.values()) {
          if (v.email === where.email) return v;
        }
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return Array.from(venuesMap.values()).filter((v) =>
        where?.is_active !== undefined ? v.is_active === where.is_active : true
      );
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = BigInt(++nextId);
      const row = { id, verification_status: 'pending', subscription_tier: 'starter', ...data };
      venuesMap.set(Number(id), row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const v = venuesMap.get(Number(where.id));
      if (!v) throw new Error('Venue not found');
      Object.assign(v, data);
      return v;
    }),
  },
  venue_checkins: {
    count: jest.fn(async ({ where }: any) => {
      return venueCheckinsList.filter((c) => {
        if (where?.venue_id !== undefined && Number(c.venue_id) !== Number(where.venue_id)) return false;
        if (where?.checked_out_at === null && c.checked_out_at !== null) return false;
        return true;
      }).length;
    }),
    groupBy: jest.fn(async ({ where }: any) => {
      const allowed = new Set((where?.venue_id?.in || []).map((x: any) => Number(x)));
      const counts = new Map<number, number>();
      for (const c of venueCheckinsList) {
        if (c.checked_out_at === null && allowed.has(Number(c.venue_id))) {
          counts.set(Number(c.venue_id), (counts.get(Number(c.venue_id)) || 0) + 1);
        }
      }
      return Array.from(counts.entries()).map(([vid, cnt]) => ({
        venue_id: BigInt(vid),
        _count: { _all: cnt },
      }));
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      const found = venueCheckinsList.find(
        (c) => Number(c.user_id) === Number(where.user_id) && c.checked_out_at === null
      );
      if (!found) return null;
      return { ...found, venues: venuesMap.get(Number(found.venue_id)) || null };
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return venueCheckinsList
        .filter((c) => {
          if (where?.venue_id !== undefined && Number(c.venue_id) !== Number(where.venue_id)) return false;
          if (where?.checked_out_at === null && c.checked_out_at !== null) return false;
          return true;
        })
        .map((c) => ({ ...c, users: usersMap.get(Number(c.user_id)) || null }));
    }),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: BigInt(++nextId), checked_out_at: null, ...data };
      venueCheckinsList.unshift(row);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const c of venueCheckinsList) {
        const matchUser = where?.user_id === undefined || Number(c.user_id) === Number(where.user_id);
        const matchVenue = where?.venue_id === undefined || Number(c.venue_id) === Number(where.venue_id);
        const matchOpen = where?.checked_out_at === null ? c.checked_out_at === null : true;
        if (matchUser && matchVenue && matchOpen) {
          Object.assign(c, data);
          count++;
        }
      }
      return { count };
    }),
  },
  events: {
    count: jest.fn(async () => 2),
  },
  burner_links: {
    findMany: jest.fn(async ({ where }: any) => {
      return Array.from(burnerLinksMap.values())
        .filter((l) => Number(l.creator_id) === Number(where.creator_id))
        .map((l) => ({
          ...l,
          users_burner_links_scanner_idTousers: l.scanner_id ? usersMap.get(Number(l.scanner_id)) : null,
        }));
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id !== undefined) return burnerLinksMap.get(Number(where.id)) || null;
      if (where.token !== undefined) {
        for (const l of burnerLinksMap.values()) {
          if (l.token === where.token) return l;
        }
      }
      return null;
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = BigInt(++nextId);
      const row = { id, scanner_id: null, chatroom_id: null, used_at: null, ...data };
      burnerLinksMap.set(Number(id), row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const l = burnerLinksMap.get(Number(where.id));
      if (!l) throw new Error('Burner link not found');
      Object.assign(l, data);
      return l;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const l = burnerLinksMap.get(Number(where.id));
      burnerLinksMap.delete(Number(where.id));
      return l;
    }),
  },
  chatrooms: {
    create: jest.fn(async ({ data }: any) => {
      const id = BigInt(++nextId);
      const row = { id, ...data };
      chatroomsMap.set(Number(id), row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const c = chatroomsMap.get(Number(where.id));
      if (c) Object.assign(c, data);
      return c;
    }),
  },
  chatroom_members: {
    createMany: jest.fn(async ({ data }: any) => {
      chatroomMembersList.push(...data);
      return { count: data.length };
    }),
  },
  reports: {
    findMany: jest.fn(async ({ where }: any) => {
      return Array.from(reportsMap.values())
        .filter((r) => Number(r.reporter_id) === Number(where.reporter_id))
        .map((r) => ({
          ...r,
          users_reports_accused_idTousers: usersMap.get(Number(r.accused_id)) || null,
        }));
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      const r = reportsMap.get(Number(where.id));
      if (!r || Number(r.reporter_id) !== Number(where.reporter_id)) return null;
      return {
        ...r,
        users_reports_accused_idTousers: usersMap.get(Number(r.accused_id)) || null,
      };
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = BigInt(++nextId);
      const row = { id, resolution_notes: null, ...data };
      reportsMap.set(Number(id), row);
      return row;
    }),
  },
  merchant_profiles: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.user_id !== undefined) {
        for (const p of merchantProfilesMap.values()) {
          if (Number(p.user_id) === Number(where.user_id)) return p;
        }
      }
      if (where.id !== undefined) return merchantProfilesMap.get(Number(where.id)) || null;
      return null;
    }),
  },
  merchant_inventories: {
    findMany: jest.fn(async ({ where }: any) => {
      return Array.from(merchantInventoriesMap.values()).filter(
        (i) =>
          Number(i.merchant_profile_id) === Number(where.merchant_profile_id) &&
          (where.is_available === undefined || i.is_available === where.is_available)
      );
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const item = merchantInventoriesMap.get(Number(where.id));
      if (!item) return null;
      return {
        ...item,
        merchant_profiles: merchantProfilesMap.get(Number(item.merchant_profile_id)) || null,
      };
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = BigInt(++nextId);
      const row = { id, ...data };
      merchantInventoriesMap.set(Number(id), row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const item = merchantInventoriesMap.get(Number(where.id));
      if (!item) throw new Error('Item not found');
      if (data.stock_count?.decrement) {
        item.stock_count = Number(item.stock_count) - Number(data.stock_count.decrement);
      } else {
        Object.assign(item, data);
      }
      return item;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const item = merchantInventoriesMap.get(Number(where.id));
      merchantInventoriesMap.delete(Number(where.id));
      return item;
    }),
  },
  inventory_redemptions: {
    count: jest.fn(async ({ where }: any) => {
      return inventoryRedemptionsList.filter(
        (r) => Number(r.merchant_inventory_id) === Number(where.merchant_inventory_id)
      ).length;
    }),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: BigInt(++nextId), redeemed_at: null, ...data };
      inventoryRedemptionsList.push(row);
      return row;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      const code = where.redemption_code || where.OR?.[0]?.redemption_code;
      const found = inventoryRedemptionsList.find(
        (r) => String(r.redemption_code).toUpperCase() === String(code).toUpperCase()
      );
      if (!found) return null;
      return {
        ...found,
        merchant_inventories: merchantInventoriesMap.get(Number(found.merchant_inventory_id)) || null,
        users: usersMap.get(Number(found.user_id)) || null,
      };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const found = inventoryRedemptionsList.find((r) => Number(r.id) === Number(where.id));
      if (found) Object.assign(found, data);
      return found;
    }),
  },
  wallet_transactions: {
    create: jest.fn(async ({ data }: any) => ({ id: BigInt(++nextId), ...data })),
  },
  $transaction: jest.fn(async (ops: Promise<any>[]) => Promise.all(ops)),
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../src/socket.js', () => ({
  getIO: () => null,
  pushToUser: (userId: number, event: string, data: any) => {
    pushedSocketEvents.push({ userId, event, data });
  },
  pushMatchNotification: jest.fn(),
  pushNotification: jest.fn(),
}));

const { default: venuePortalRoutes } = await import('../src/routes/venue-portal.js');
const { default: venuesRoutes } = await import('../src/routes/venues.js');
const { default: burnerLinksRoutes } = await import('../src/routes/burner-links.js');
const { default: reportsRoutes } = await import('../src/routes/reports.js');
const { default: merchantPortalRoutes } = await import('../src/routes/merchant-portal.js');
const { default: marketplaceRoutes } = await import('../src/routes/marketplace.js');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/venue', venuePortalRoutes);
  app.use('/api/venues', venuesRoutes);
  app.use('/api/burner-links', burnerLinksRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/merchant-portal', merchantPortalRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  return app;
}

describe('v2.3.95 Venue Portal, Venue Check-ins, Burner Bridge, Reports & Merchant Inventory', () => {
  const app = buildTestApp();
  let aliceToken: string;
  let bobToken: string;

  beforeEach(() => {
    pushedSocketEvents.length = 0;
    usersMap.clear();
    venuesMap.clear();
    venueCheckinsList.length = 0;
    burnerLinksMap.clear();
    chatroomsMap.clear();
    chatroomMembersList.length = 0;
    reportsMap.clear();
    merchantProfilesMap.clear();
    merchantInventoriesMap.clear();
    inventoryRedemptionsList.length = 0;

    usersMap.set(1, {
      id: BigInt(1),
      name: 'Alice',
      email: 'alice@fwber.online',
      role: 'user',
      token_balance: 500,
      user_profiles: [{ display_name: 'Alice Detroit', avatar_url: null }],
    });
    usersMap.set(2, {
      id: BigInt(2),
      name: 'Bob',
      email: 'bob@fwber.online',
      role: 'user',
      token_balance: 250,
      user_profiles: [{ display_name: 'Bob Midtown', avatar_url: null }],
    });

    merchantProfilesMap.set(10, {
      id: BigInt(10),
      user_id: BigInt(1),
      business_name: 'Midtown Craft Lounge',
      category: 'food',
      verification_status: 'approved',
    });

    aliceToken = jwt.sign({ id: 1 }, JWT_SECRET);
    bobToken = jwt.sign({ id: 2 }, JWT_SECRET);
  });

  it('registers, logs in, hydrates, and updates a Venue Partner Portal account (/api/venue/*)', async () => {
    const regRes = await request(app).post('/api/venue/register').send({
      name: 'Cliff Bell Lounge',
      email: 'partner@cliffbells.test',
      password: 'VenueSecretPassword99!',
      password_confirmation: 'VenueSecretPassword99!',
      business_type: 'lounge',
      address: '2030 Park Ave',
      city: 'Detroit',
      state: 'MI',
      capacity: 140,
    });
    expect(regRes.status).toBe(201);
    expect(regRes.body.token).toBeTruthy();
    expect(regRes.body.venue.name).toBe('Cliff Bell Lounge');
    expect(regRes.body.venue.capacity).toBe(140);

    // Reject normal user JWT on venue portal
    const wrongScope = await request(app)
      .get('/api/venue/me')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(wrongScope.status).toBe(403);

    // Login with venue credentials
    const loginRes = await request(app).post('/api/venue/login').send({
      email: 'partner@cliffbells.test',
      password: 'VenueSecretPassword99!',
    });
    expect(loginRes.status).toBe(200);
    const venueToken = loginRes.body.token;

    // Update venue profile via PUT /api/venue/me
    const putRes = await request(app)
      .put('/api/venue/me')
      .set('Authorization', `Bearer ${venueToken}`)
      .send({
        description: 'Live jazz and craft cocktails nightly',
        capacity: 175,
        website: 'https://cliffbells.example',
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.venue.capacity).toBe(175);
    expect(putRes.body.venue.description).toBe('Live jazz and craft cocktails nightly');

    // Member checks into the venue -> verify venue /me telemetry reflects it
    const venueId = regRes.body.venue.id;
    const checkinRes = await request(app)
      .post(`/api/venues/${venueId}/checkin`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ latitude: 42.336, longitude: -83.051, message: 'At the jazz bar!' });
    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.checkin.venue_id).toBe(venueId);

    const currentRes = await request(app)
      .get('/api/venues/current-checkin')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(currentRes.status).toBe(200);
    expect(currentRes.body.checkin.venue.name).toBe('Cliff Bell Lounge');

    const meRes = await request(app)
      .get('/api/venue/me')
      .set('Authorization', `Bearer ${venueToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.stats.active_checkins).toBe(1);
    expect(meRes.body.stats.total_checkins).toBe(1);
    expect(meRes.body.recent_checkins[0].user_name).toBe('Alice Detroit');

    // Member checks out -> current-checkin returns null
    const checkoutRes = await request(app)
      .post(`/api/venues/${venueId}/checkout`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(checkoutRes.status).toBe(200);

    const afterCheckout = await request(app)
      .get('/api/venues/current-checkin')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(afterCheckout.body.checkin).toBeNull();
  });

  it('provisions a private 24-hour chatroom on Burner Bridge join and supports link revocation', async () => {
    const createRes = await request(app)
      .post('/api/burner-links')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ expires_in_hours: 12 });
    expect(createRes.status).toBe(201);
    const { id, token } = createRes.body;

    const statusBefore = await request(app)
      .get(`/api/burner-links/${token}/status`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body.used).toBe(false);
    expect(statusBefore.body.chatroom_id).toBeNull();

    // Bob scans/joins Alice's burner link
    const joinRes = await request(app)
      .post(`/api/burner-links/${token}/join`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(joinRes.status).toBe(200);
    expect(typeof joinRes.body.chatroom_id).toBe('number');
    expect(joinRes.body.chatroom_id).toBeGreaterThan(0);
    expect(chatroomMembersList).toHaveLength(2);
    expect(pushedSocketEvents[0]?.event).toBe('burner_link_joined');

    // Poll status now reports used=true + chatroom_id
    const statusAfter = await request(app)
      .get(`/api/burner-links/${token}/status`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(statusAfter.body.used).toBe(true);
    expect(statusAfter.body.chatroom_id).toBe(joinRes.body.chatroom_id);

    // Alice revokes the burner link
    const delRes = await request(app)
      .delete(`/api/burner-links/${id}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('files, lists, and inspects safety reports while preventing self-reports', async () => {
    const selfReport = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ accused_id: 1, reason: 'Spam' });
    expect(selfReport.status).toBe(400);

    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        accused_id: 2,
        reason: 'Harassment or abusive behavior',
        details: 'Repeated unsolicited messages after boundary stated.',
      });
    expect(createRes.status).toBe(201);
    const reportId = createRes.body.report.id;

    const listRes = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].accused_name).toBe('Bob');

    const detailRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.report.details).toContain('Repeated unsolicited messages');
  });

  it('creates inventory items using price_tokens, redeems purchased FWB codes once, and deletes/archives items', async () => {
    const createItem = await request(app)
      .post('/api/merchant-portal/inventory')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Craft Espresso Martini',
        description: 'Redeemable at the main bar',
        price_tokens: 25,
        stock_count: 10,
      });
    expect(createItem.status).toBe(201);
    const itemId = createItem.body.item.id;
    expect(createItem.body.item.price_tokens).toBe(25);

    // Bob purchases the item -> generates an FWB-... redemption code stored in inventory_redemptions
    const purchaseRes = await request(app)
      .post(`/api/marketplace/purchase/${itemId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(purchaseRes.status).toBe(200);
    const code = purchaseRes.body.redemption_code;
    expect(code).toMatch(/^FWB-/);

    // Alice redeems the code at Merchant POS
    const redeemRes = await request(app)
      .post('/api/merchant-portal/inventory/redeem')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ code });
    expect(redeemRes.status).toBe(200);
    expect(redeemRes.body.success).toBe(true);
    expect(redeemRes.body.item_name).toBe('Craft Espresso Martini');
    expect(redeemRes.body.user_name).toBe('Bob Midtown');

    // Second redemption attempt of the same code is rejected with 409
    const duplicateRedeem = await request(app)
      .post('/api/merchant-portal/inventory/redeem')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ code });
    expect(duplicateRedeem.status).toBe(409);

    // Delete item with historical redemption -> soft-archived and omitted from active inventory list
    const delRes = await request(app)
      .delete(`/api/merchant-portal/inventory/${itemId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(delRes.status).toBe(200);

    const invList = await request(app)
      .get('/api/merchant-portal/inventory')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(invList.body.items).toHaveLength(0);
  });
});
