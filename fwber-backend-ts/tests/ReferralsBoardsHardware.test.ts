import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const state: any = {
  users: new Map<string, any>(),
  vouches: [] as any[],
  tokenTransactions: [] as any[],
  topics: [] as any[],
  topicFollows: [] as any[],
  artifacts: [] as any[],
  hardwareTokens: [] as any[],
  nextTopicId: 10n,
  nextArtifactId: 100n,
  nextHwId: 500n,
};

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where?.id !== undefined) return state.users.get(String(where.id)) || null;
      return null;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      for (const u of state.users.values()) {
        if (where?.referral_code && u.referral_code === where.referral_code) return u;
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      const out: any[] = [];
      for (const u of state.users.values()) {
        if (where?.referrer_id !== undefined && String(u.referrer_id) === String(where.referrer_id)) {
          out.push(u);
        }
      }
      return out;
    }),
    count: jest.fn(async ({ where }: any) => {
      let c = 0;
      for (const u of state.users.values()) {
        if (where?.referrer_id?.in) {
          const allowed = new Set(where.referrer_id.in.map((id: any) => String(id)));
          if (u.referrer_id && allowed.has(String(u.referrer_id))) c++;
        } else if (where?.referrer_id !== undefined && String(u.referrer_id) === String(where.referrer_id)) {
          c++;
        }
      }
      return c;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = state.users.get(String(where.id));
      if (!existing) throw new Error('User not found');
      if (data.referral_code !== undefined) existing.referral_code = data.referral_code;
      if (data.referrer_id !== undefined) existing.referrer_id = data.referrer_id;
      if (data.token_balance?.increment) {
        existing.token_balance = Number(existing.token_balance || 0) + Number(data.token_balance.increment);
      }
      if (data.last_seen_at !== undefined) existing.last_seen_at = data.last_seen_at;
      return existing;
    }),
  },
  vouches: {
    count: jest.fn(async ({ where }: any) =>
      state.vouches.filter((v: any) => String(v.to_user_id) === String(where?.to_user_id)).length
    ),
    findMany: jest.fn(async ({ where }: any) =>
      state.vouches.filter((v: any) => String(v.to_user_id) === String(where?.to_user_id))
    ),
  },
  token_transactions: {
    create: jest.fn(async ({ data }: any) => {
      state.tokenTransactions.push(data);
      return { id: BigInt(state.tokenTransactions.length), ...data };
    }),
  },
  topics: {
    count: jest.fn(async () => state.topics.length),
    findMany: jest.fn(async () => state.topics.map((t: any) => ({
      ...t,
      _count: {
        topic_user_follows: state.topicFollows.filter((f: any) => f.topic_id === t.id).length,
      },
    }))),
    findUnique: jest.fn(async ({ where }: any) =>
      state.topics.find((t: any) => (where?.slug && t.slug === where.slug) || (where?.id && t.id === where.id)) || null
    ),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: state.nextTopicId++, ...data };
      state.topics.push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = state.topics.find((t: any) => t.id === where.id);
      if (!row) throw new Error('Topic not found');
      if (data.follower_count?.increment) row.follower_count += data.follower_count.increment;
      if (data.follower_count?.decrement) row.follower_count -= data.follower_count.decrement;
      return row;
    }),
  },
  topic_user_follows: {
    findMany: jest.fn(async ({ where }: any) =>
      state.topicFollows.filter((f: any) => f.user_id === where?.user_id)
    ),
    findFirst: jest.fn(async ({ where }: any) =>
      state.topicFollows.find(
        (f: any) => f.user_id === where?.user_id && f.topic_id === where?.topic_id
      ) || null
    ),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: BigInt(state.topicFollows.length + 1), ...data };
      state.topicFollows.push(row);
      return row;
    }),
    upsert: jest.fn(async ({ where, create }: any) => {
      const key = where?.topic_id_user_id;
      const existing = state.topicFollows.find(
        (f: any) => f.topic_id === key?.topic_id && f.user_id === key?.user_id
      );
      if (existing) return existing;
      const row = { id: BigInt(state.topicFollows.length + 1), ...create };
      state.topicFollows.push(row);
      return row;
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      const before = state.topicFollows.length;
      state.topicFollows = state.topicFollows.filter(
        (f: any) => !(f.topic_id === where?.topic_id && f.user_id === where?.user_id)
      );
      return { count: before - state.topicFollows.length };
    }),
  },
  proximity_artifacts: {
    findMany: jest.fn(async () => state.artifacts),
    findUnique: jest.fn(async ({ where }: any) =>
      state.artifacts.find((a: any) => a.id === where?.id) || null
    ),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: state.nextArtifactId++, ...data };
      state.artifacts.push(row);
      return row;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const idx = state.artifacts.findIndex((a: any) => a.id === where.id);
      if (idx >= 0) return state.artifacts.splice(idx, 1)[0];
      throw new Error('Artifact not found');
    }),
  },
  user_profiles: {
    findFirst: jest.fn(async () => null),
  },
  hardware_tokens: {
    findMany: jest.fn(async ({ where }: any) =>
      state.hardwareTokens.filter(
        (t: any) => t.user_id === where?.user_id && (where?.is_active === undefined || t.is_active === where.is_active)
      )
    ),
    findUnique: jest.fn(async ({ where }: any) =>
      state.hardwareTokens.find((t: any) => t.token_uuid === where?.token_uuid) || null
    ),
    findFirst: jest.fn(async ({ where }: any) =>
      state.hardwareTokens.find((t: any) => {
        if (where?.user_id !== undefined && t.user_id !== where.user_id) return false;
        if (where?.is_active !== undefined && t.is_active !== where.is_active) return false;
        if (where?.token_uuid !== undefined && t.token_uuid !== where.token_uuid) return false;
        if (where?.id !== undefined && t.id !== where.id) return false;
        return true;
      }) || null
    ),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: state.nextHwId++, ...data };
      state.hardwareTokens.push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = state.hardwareTokens.find((t: any) => t.id === where.id);
      if (!row) throw new Error('Token not found');
      Object.assign(row, data);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const row of state.hardwareTokens) {
        if (row.user_id === where?.user_id && (where?.is_active === undefined || row.is_active === where.is_active)) {
          Object.assign(row, data);
          count++;
        }
      }
      return { count };
    }),
  },
  $queryRawUnsafe: jest.fn(async () => {
    throw new Error('use prisma fallback in unit test');
  }),
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
};

function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = serialize(obj[k]);
    return out;
  }
  return obj;
}

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
  serialize,
}));

const { default: referralsRoutes } = await import('../src/routes/referrals.js');
const { default: bulletinBoardsRoutes } = await import('../src/routes/bulletin-boards.js');
const { default: hardwareTokensRoutes } = await import('../src/routes/hardware-tokens.js');
const { default: analyticsRoutes } = await import('../src/routes/analytics.js');

const SECRET = process.env.JWT_SECRET || 'secret';
function mintUserToken(id: number, role = 'user') {
  return jwt.sign({ id, email: `user${id}@fwber.online`, role }, SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/referrals', referralsRoutes);
  app.use('/api/bulletin-boards', bulletinBoardsRoutes);
  app.use('/api/hardware-tokens', hardwareTokensRoutes);
  app.use('/api/analytics', analyticsRoutes);
  return app;
}

describe('v2.3.96 Referrals & Vouches, Bulletin Boards, Hardware Tokens & Analytics Beacons', () => {
  beforeEach(() => {
    state.users.clear();
    state.vouches = [];
    state.tokenTransactions = [];
    state.topics = [];
    state.topicFollows = [];
    state.artifacts = [];
    state.hardwareTokens = [];

    state.users.set('1', {
      id: 1n,
      name: 'Alice Inviter',
      referral_code: null,
      token_balance: 100,
      golden_tickets_remaining: 3,
      referrer_id: null,
      created_at: new Date(),
    });
    state.users.set('2', {
      id: 2n,
      name: 'Bob Invitee',
      referral_code: 'BOBCODE1',
      token_balance: 10,
      golden_tickets_remaining: 3,
      referrer_id: null,
      created_at: new Date(),
    });
    state.vouches.push({
      id: 1n,
      to_user_id: 1n,
      voucher_name: 'Charlie',
      type: 'safe',
      comment: 'Solid friend IRL',
      is_verified: true,
      created_at: new Date(),
    });
  });

  it('auto-mints referral codes, includes reward_rules for ReferralModal, and applies two-way referral bonuses once', async () => {
    const app = createApp();
    const aliceJwt = mintUserToken(1);
    const bobJwt = mintUserToken(2);

    // 1. Alice hits /api/referrals/summary with null referral_code -> auto-mints code + returns reward_rules
    const sumRes = await request(app)
      .get('/api/referrals/summary')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(sumRes.status).toBe(200);
    expect(sumRes.body.referral_code).toBeTruthy();
    expect(sumRes.body.referral_link).toContain(sumRes.body.referral_code);
    expect(sumRes.body.vouch_link).toContain(sumRes.body.referral_code);
    expect(sumRes.body.reward_rules.level_1.token_amount).toBe(50);
    expect(sumRes.body.vouches_count).toBe(1);

    const aliceCode = sumRes.body.referral_code;

    // 2. Self-referral is rejected with 400
    const selfRes = await request(app)
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${aliceJwt}`)
      .send({ code: aliceCode });
    expect(selfRes.status).toBe(400);

    // 3. Bob applies Alice's code -> Bob gets +25 FWB, Alice gets +50 FWB, and duplicate apply is blocked
    const applyRes = await request(app)
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${bobJwt}`)
      .send({ code: aliceCode.toLowerCase() });
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.bonus_tokens).toBe(25);
    expect(state.users.get('1').token_balance).toBe(150);
    expect(state.users.get('2').token_balance).toBe(35);
    expect(state.tokenTransactions.length).toBe(2);

    const dupRes = await request(app)
      .post('/api/referrals/apply')
      .set('Authorization', `Bearer ${bobJwt}`)
      .send({ code: aliceCode });
    expect(dupRes.status).toBe(400);

    // 4. GET /api/referrals returns invited members + vouches
    const feedRes = await request(app)
      .get('/api/referrals')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.referrals).toHaveLength(1);
    expect(feedRes.body.referrals[0].name).toBe('Bob Invitee');
    expect(feedRes.body.vouches).toHaveLength(1);
  });

  it('creates community bulletin boards, enforces idempotent follow counts, posts notes, and restricts post deletion to author', async () => {
    const app = createApp();
    const aliceJwt = mintUserToken(1);
    const bobJwt = mintUserToken(2);

    // 1. Create a new neighborhood board
    const createBoard = await request(app)
      .post('/api/bulletin-boards/boards')
      .set('Authorization', `Bearer ${aliceJwt}`)
      .send({
        name: 'Midtown Late Night',
        category: 'nightlife',
        emoji: '🌙',
        description: 'After-hours warehouse & jazz updates',
      });
    expect(createBoard.status).toBe(201);
    expect(createBoard.body.board.slug).toBe('midtown-late-night');
    expect(createBoard.body.board.is_followed).toBe(true);

    // 2. Repeat follow by Alice does NOT double-increment follower_count
    await request(app)
      .post('/api/bulletin-boards/midtown-late-night/follow')
      .set('Authorization', `Bearer ${aliceJwt}`);
    const listAfterDup = await request(app)
      .get('/api/bulletin-boards')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(listAfterDup.status).toBe(200);
    expect(listAfterDup.body.boards[0].follower_count).toBe(1);

    // 3. Alice posts a board note
    const postRes = await request(app)
      .post('/api/bulletin-boards')
      .set('Authorization', `Bearer ${aliceJwt}`)
      .send({
        topic_slug: 'midtown-late-night',
        content: 'Jazz quartet playing at Cliff Bell’s tonight at 10pm!',
      });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.id;

    // 4. Board detail returns the post with is_mine flags
    const detailAlice = await request(app)
      .get('/api/bulletin-boards/midtown-late-night')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(detailAlice.status).toBe(200);
    expect(detailAlice.body.posts).toHaveLength(1);
    expect(detailAlice.body.posts[0].is_mine).toBe(true);

    // 5. Bob cannot delete Alice's post (403), Alice can (200)
    const bobDel = await request(app)
      .delete(`/api/bulletin-boards/posts/${postId}`)
      .set('Authorization', `Bearer ${bobJwt}`);
    expect(bobDel.status).toBe(403);

    const aliceDel = await request(app)
      .delete(`/api/bulletin-boards/posts/${postId}`)
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(aliceDel.status).toBe(200);
    expect(aliceDel.body.deleted_id).toBe(postId);
  });

  it('pairs, pings, blocks cross-account hijacking, and unpairs BLE hardware tokens, plus accepts batched analytics beacons', async () => {
    const app = createApp();
    const aliceJwt = mintUserToken(1);
    const bobJwt = mintUserToken(2);

    // 1. Pair hardware token for Alice
    const pairRes = await request(app)
      .post('/api/hardware-tokens/register')
      .set('Authorization', `Bearer ${aliceJwt}`)
      .send({ token_uuid: 'hw_A7X9B2', hardware_model: 'fwber_band_v1' });
    expect(pairRes.status).toBe(201);
    expect(pairRes.body.token.token_uuid).toBe('hw_A7X9B2');

    // 2. Bob cannot hijack Alice's active hardware token (409)
    const hijackRes = await request(app)
      .post('/api/hardware-tokens/register')
      .set('Authorization', `Bearer ${bobJwt}`)
      .send({ token_uuid: 'hw_A7X9B2' });
    expect(hijackRes.status).toBe(409);

    // 3. Ping updates last_seen_at and status returns active token
    const pingRes = await request(app)
      .post('/api/hardware-tokens/ping')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(pingRes.status).toBe(200);
    expect(pingRes.body.success).toBe(true);

    const statusRes = await request(app)
      .get('/api/hardware-tokens/status')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.token.token_uuid).toBe('hw_A7X9B2');

    // 4. Unpair deactivates token
    const unpairRes = await request(app)
      .delete('/api/hardware-tokens/hw_A7X9B2')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(unpairRes.status).toBe(200);
    expect(unpairRes.body.removed).toBe(true);

    const afterStatus = await request(app)
      .get('/api/hardware-tokens/status')
      .set('Authorization', `Bearer ${aliceJwt}`);
    expect(afterStatus.body.token).toBeNull();

    // 5. Batched analytics events endpoint returns 202 and touches last_seen_at
    const beaconRes = await request(app)
      .post('/api/analytics/events')
      .set('Authorization', `Bearer ${aliceJwt}`)
      .send({
        session_id: 'sess-123',
        events: [{ event_name: 'page_view', payload: { path: '/referrals' } }],
      });
    expect(beaconRes.status).toBe(202);
    expect(beaconRes.body.accepted).toBe(1);
  });
});
