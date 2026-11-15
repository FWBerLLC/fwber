import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const tmpLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwber-pm2-logs-'));
fs.writeFileSync(path.join(tmpLogDir, 'fwber-backend-ts-out.log'), '2026-11-15 INFO server ready\n', 'utf8');
fs.writeFileSync(path.join(tmpLogDir, 'other-tenant-secret.log'), 'DO NOT EXPOSE\n', 'utf8');
process.env.PM2_LOG_DIR = tmpLogDir;

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user_profiles: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  proximity_artifacts: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  shadow_throttles: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  geo_spoof_detections: {
    count: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  moderation_actions: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  global_bans: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  reports: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  blocks: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  autonomous_actions: {
    findMany: jest.fn(),
  },
  security_events: {
    findMany: jest.fn(),
  },
  failed_jobs: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  matches: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  friends: {
    findFirst: jest.fn(),
  },
  content_unlocks: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  creator_subscriptions: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  wallet_transactions: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  zk_proximity_proofs: {
    create: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
  },
  physical_nodes: {
    findUnique: jest.fn(),
  },
  user_locations: {
    findFirst: jest.fn(),
  },
  relationship_links: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  messages: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  merchant_profiles: {
    findUnique: jest.fn(),
  },
  autonomous_settings: {
    findUnique: jest.fn(),
  },
  promotion_events: {
    count: jest.fn(),
  },
  merchant_payments: {
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(async (arg: any) => {
    if (typeof arg === 'function') {
      return arg(mockPrisma);
    }
    return Promise.all(arg);
  }),
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
  serialize: (obj: any) => JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))),
  sanitizeUser: (u: any) => {
    if (!u) return u;
    const copy = { ...u };
    delete copy.password;
    return copy;
  },
}));

jest.unstable_mockModule('../src/lib/wingman-ai.js', () => ({
  generateText: jest.fn(async (_sys: string, text: string) => `Hola: ${text}`),
  generatePublicRoast: jest.fn(async () => 'Great vibe!'),
}));

const { default: moderationRoutes } = await import('../src/routes/moderation.js');
const { default: adminRoutes } = await import('../src/routes/admin.js');
const { default: analyticsRoutes } = await import('../src/routes/analytics.js');
const { default: matchesRoutes } = await import('../src/routes/matches.js');
const { default: subscriptionsRoutes } = await import('../src/routes/subscriptions.js');
const { default: proximityRoutes } = await import('../src/routes/proximity.js');
const { default: publicRoutes } = await import('../src/routes/public.js');
const { default: locationRoutes } = await import('../src/routes/location.js');
const { default: authRoutes, federatedHttp } = await import('../src/routes/auth.js');
const { default: relationshipLinksRoutes } = await import('../src/routes/relationship-links.js');
const { default: messagesRoutes } = await import('../src/routes/messages.js');
const { default: userRoutes } = await import('../src/routes/user.js');
const { default: merchantPortalRoutes } = await import('../src/routes/merchant-portal.js');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const modToken = jwt.sign({ id: 1, email: 'mod@fwber.online', role: 'moderator' }, JWT_SECRET, { expiresIn: '1h' });
const userToken = jwt.sign({ id: 10, email: 'alice@fwber.online', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/matches', matchesRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/proximity', proximityRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/relationship-links', relationshipLinksRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/merchant-portal', merchantPortalRoutes);
  return app;
}

describe('v2.3.92 Consolidation: Moderation, ZK Proximity, Federated Login, Creator Subscriptions & CRDT Sync', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => {
      const idNum = Number(where?.id || 0);
      if (idNum === 1) return { id: 1n, name: 'Mod', email: 'mod@fwber.online', role: 'moderator', token_balance: 500 };
      if (idNum === 10) return { id: 10n, name: 'Alice', email: 'alice@fwber.online', role: 'user', token_balance: 100, user_profiles: [{ display_name: 'Alice' }] };
      if (idNum === 20) return { id: 20n, name: 'Creator Bob', email: 'bob@fwber.online', role: 'user', token_balance: 50, user_profiles: [{ display_name: 'Bob', subscription_price: 30 }] };
      return null;
    });
  });

  afterAll(() => {
    fs.rmSync(tmpLogDir, { recursive: true, force: true });
  });

  it('1. Moderation Dashboard returns nested stats object for moderators and blocks non-moderators', async () => {
    const denied = await request(app)
      .get('/api/moderation/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    expect(denied.status).toBe(403);

    mockPrisma.proximity_artifacts.count.mockResolvedValue(4);
    mockPrisma.shadow_throttles.count.mockResolvedValue(2);
    mockPrisma.geo_spoof_detections.count.mockResolvedValue(1);
    mockPrisma.moderation_actions.count.mockResolvedValue(7);
    mockPrisma.moderation_actions.findMany.mockResolvedValue([]);
    mockPrisma.reports.count.mockResolvedValue(3);
    mockPrisma.blocks.count.mockResolvedValue(5);

    const ok = await request(app)
      .get('/api/moderation/dashboard')
      .set('Authorization', `Bearer ${modToken}`);
    expect(ok.status).toBe(200);
    expect(ok.body.stats).toEqual({
      flagged_artifacts: 4,
      active_throttles: 2,
      pending_spoof_detections: 1,
      moderation_actions_today: 7,
    });
  });

  it('2. Admin Log Viewer filters strictly to fwber-* logs and blocks path traversal', async () => {
    mockPrisma.autonomous_actions.findMany.mockResolvedValue([]);
    mockPrisma.security_events.findMany.mockResolvedValue([]);

    const listRes = await request(app)
      .get('/api/admin/logs')
      .set('Authorization', `Bearer ${modToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const names = listRes.body.map((l: any) => l.name);
    expect(names).toContain('fwber-backend-ts-out.log');
    expect(names).toContain('autonomous-audit.log');
    expect(names).not.toContain('other-tenant-secret.log');

    const nonFwberLog = await request(app)
      .get('/api/admin/logs/other-tenant-secret.log')
      .set('Authorization', `Bearer ${modToken}`);
    expect(nonFwberLog.status).toBe(404);

    const invalidFilename = await request(app)
      .get('/api/admin/logs/bad$name!.log')
      .set('Authorization', `Bearer ${modToken}`);
    expect(invalidFilename.status).toBe(400);

    const validLog = await request(app)
      .get('/api/admin/logs/fwber-backend-ts-out.log')
      .set('Authorization', `Bearer ${modToken}`);
    expect(validLog.status).toBe(200);
    expect(validLog.body.content).toContain('INFO server ready');
  });

  it('3. Failed Jobs queue lists and flushes jobs for operators', async () => {
    mockPrisma.failed_jobs.findMany.mockResolvedValue([
      { id: 1n, uuid: 'job-uuid-1', connection: 'redis', queue: 'default', exception: 'Error: timeout', failed_at: new Date() },
    ]);
    mockPrisma.failed_jobs.count.mockResolvedValue(1);

    const listRes = await request(app)
      .get('/api/analytics/failed-jobs')
      .set('Authorization', `Bearer ${modToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].uuid).toBe('job-uuid-1');

    mockPrisma.failed_jobs.deleteMany.mockResolvedValue({ count: 1 });
    const flushRes = await request(app)
      .post('/api/analytics/failed-jobs/flush')
      .set('Authorization', `Bearer ${modToken}`);
    expect(flushRes.status).toBe(200);
    expect(flushRes.body.flushed).toBe(1);
  });

  it('4. Match Insights computes locked/unlocked state and performs atomic 10-FWB unlock', async () => {
    mockPrisma.matches.findUnique.mockResolvedValue(null);
    mockPrisma.matches.findFirst.mockResolvedValue({ id: 99n, user1_id: 10n, user2_id: 20n, status: 'accepted', match_score: 88 });
    mockPrisma.user_profiles.findFirst
      .mockResolvedValueOnce({ display_name: 'Alice', interests: ['music', 'hiking'], looking_for: ['dating'] })
      .mockResolvedValueOnce({ display_name: 'Bob', interests: ['music', 'cooking'], looking_for: ['dating'], is_verified: true });
    mockPrisma.content_unlocks.findUnique.mockResolvedValue(null);
    mockPrisma.creator_subscriptions.findFirst.mockResolvedValue(null);
    mockPrisma.messages.count.mockResolvedValue(6);

    const lockedRes = await request(app)
      .get('/api/matches/20/insights')
      .set('Authorization', `Bearer ${userToken}`);
    expect(lockedRes.status).toBe(200);
    expect(lockedRes.body.data.total_score).toBe(88);
    expect(lockedRes.body.data.is_locked).toBe(true);

    mockPrisma.users.update.mockResolvedValue({ token_balance: 90 });
    mockPrisma.content_unlocks.create.mockResolvedValue({ id: 5n });
    mockPrisma.wallet_transactions.create.mockResolvedValue({ id: 12n });

    const unlockRes = await request(app)
      .post('/api/matches/20/insights/unlock')
      .set('Authorization', `Bearer ${userToken}`);
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.new_balance).toBe(90);
  });

  it('5. Creator Subscriptions debits subscriber, credits creator, and returns 402 when underfunded', async () => {
    mockPrisma.creator_subscriptions.findUnique.mockResolvedValue(null);
    mockPrisma.users.update.mockResolvedValueOnce({ token_balance: 70 }).mockResolvedValueOnce({ token_balance: 77 });
    mockPrisma.creator_subscriptions.upsert.mockResolvedValue({
      id: 1n,
      expires_at: new Date(Date.now() + 30 * 86_400_000),
    });
    mockPrisma.wallet_transactions.createMany.mockResolvedValue({ count: 2 });

    const subRes = await request(app)
      .post('/api/subscriptions/creator/20')
      .set('Authorization', `Bearer ${userToken}`);
    expect(subRes.status).toBe(200);
    expect(subRes.body.is_subscribed).toBe(true);
    expect(subRes.body.cost).toBe(30);

    // Insufficient balance check
    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => {
      const idNum = Number(where?.id || 0);
      if (idNum === 10) return { id: 10n, name: 'Alice', email: 'alice@fwber.online', role: 'user', token_balance: 15 };
      if (idNum === 20) return { id: 20n, name: 'Bob', email: 'bob@fwber.online', role: 'user', user_profiles: [{ subscription_price: 500 }] };
      return null;
    });
    const brokeRes = await request(app)
      .post('/api/subscriptions/creator/20')
      .set('Authorization', `Bearer ${userToken}`);
    expect(brokeRes.status).toBe(402);
  });

  it('6. Zero-Knowledge Proximity Proof & Token Drop Claim validate HMAC and credit FWB atomically', async () => {
    const paramsRes = await request(app)
      .get('/api/proximity/zk-params')
      .set('Authorization', `Bearer ${userToken}`);
    expect(paramsRes.status).toBe(200);
    expect(paramsRes.body.precision).toBe(7);

    const geohash = 'dpsb8u2';
    const timestamp = Math.floor(Date.now() / 1000);
    const targetEntityId = 42;
    const sig = crypto
      .createHmac('sha256', paramsRes.body.secret)
      .update(`${geohash}${timestamp}${targetEntityId}`)
      .digest('hex');

    mockPrisma.zk_proximity_proofs.create.mockResolvedValue({ id: 77n });

    const verifyRes = await request(app)
      .post('/api/proximity/zk-verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        target_entity_type: 'venue',
        target_entity_id: targetEntityId,
        proof_payload: { geohash, signature: sig },
        public_signals: { timestamp, target_entity_id: targetEntityId },
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    expect(verifyRes.body.record_id).toBe(77);

    // Token Drop claim
    mockPrisma.proximity_artifacts.findUnique.mockResolvedValue({
      id: 500n,
      user_id: 20n,
      type: 'token_drop',
      meta: { amount: 15, claimed: false },
    });
    mockPrisma.proximity_artifacts.update.mockResolvedValue({});
    mockPrisma.users.update.mockResolvedValue({ token_balance: 115 });
    mockPrisma.wallet_transactions.create.mockResolvedValue({});

    const claimRes = await request(app)
      .post('/api/proximity/artifacts/500/claim')
      .set('Authorization', `Bearer ${userToken}`);
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.claimed).toBe(true);
    expect(claimRes.body.amount).toBe(15);
    expect(claimRes.body.new_balance).toBe(115);
  });

  it('7. Public Pulse Node, NFC Exchange & AR Aura enforce privacy and block rules', async () => {
    mockPrisma.physical_nodes.findUnique.mockResolvedValue(null);
    mockPrisma.proximity_artifacts.findMany.mockResolvedValue([
      { content: 'Amazing live music and cocktails tonight!', type: 'vibe' },
    ]);

    const pulseRes = await request(app).get('/api/public/pulse/node/demo-node-1');
    expect(pulseRes.status).toBe(200);
    expect(Array.isArray(pulseRes.body.analysis.trending_keywords)).toBe(true);

    // NFC Exchange
    mockPrisma.blocks.findFirst.mockResolvedValue(null);
    mockPrisma.matches.findFirst.mockResolvedValue(null);
    mockPrisma.matches.create.mockResolvedValue({ id: 301n });
    mockPrisma.zk_proximity_proofs.create.mockResolvedValue({ id: 88n });
    mockPrisma.notifications.create.mockResolvedValue({});

    const nfcRes = await request(app)
      .post('/api/matches/nfc-exchange')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ peer_id: 20, location_proof: 'dpsb8u2x', nonce: 'abc12345' });
    expect(nfcRes.status).toBe(200);
    expect(nfcRes.body.verified).toBe(true);
    expect(nfcRes.body.match_id).toBe(301);

    // AR Aura blocked guard
    mockPrisma.matches.findUnique.mockResolvedValue({ id: 301n, user1_id: 10n, user2_id: 20n, status: 'accepted' });
    mockPrisma.blocks.findFirst.mockResolvedValue({ id: 1n });
    const auraBlocked = await request(app)
      .get('/api/location/aura/301')
      .set('Authorization', `Bearer ${userToken}`);
    expect(auraBlocked.status).toBe(403);
  });

  it('8. Federated ActivityPub Challenge + Verify issues JWT when challenge appears in remote bio', async () => {
    const spy = jest.spyOn(federatedHttp, 'getJson');
    spy.mockResolvedValueOnce({
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: 'https://mastodon.example/users/nova',
        },
      ],
    });

    const challengeRes = await request(app)
      .post('/api/auth/federated/challenge')
      .send({ handle: '@nova@mastodon.example' });
    expect(challengeRes.status).toBe(200);
    expect(challengeRes.body.actor_uri).toBe('https://mastodon.example/users/nova');
    expect(challengeRes.body.challenge).toMatch(/^fwber-verify-/);

    spy.mockResolvedValueOnce({
      id: 'https://mastodon.example/users/nova',
      preferredUsername: 'nova',
      name: 'Nova Fediverse',
      summary: `<p>Exploring proximity dating ${challengeRes.body.challenge}</p>`,
    });

    mockPrisma.users.findUnique.mockResolvedValueOnce(null);
    mockPrisma.users.create.mockResolvedValueOnce({
      id: 777n,
      name: 'Nova Fediverse',
      email: 'nova@mastodon.example.fediverse.fwber.local',
      role: 'user',
      user_profiles: [{ display_name: 'Nova Fediverse', is_federated: true }],
    });
    mockPrisma.users.count.mockResolvedValue(0);

    const verifyRes = await request(app)
      .post('/api/auth/federated/verify')
      .send({ actor_uri: 'https://mastodon.example/users/nova' });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeTruthy();
    expect(verifyRes.body.user.email).toBe('nova@mastodon.example.fediverse.fwber.local');
    spy.mockRestore();
  });

  it('9. Polycule Relationship Links, CRDT sync-batch, Translate, User Profile & Merchant CSV Export work end-to-end', async () => {
    mockPrisma.relationship_links.findMany.mockResolvedValue([]);
    const linksRes = await request(app)
      .get('/api/relationship-links')
      .set('Authorization', `Bearer ${userToken}`);
    expect(linksRes.status).toBe(200);
    expect(Array.isArray(linksRes.body.links)).toBe(true);

    // Message translation
    const trRes = await request(app)
      .post('/api/messages/translate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ text: 'See you at 8pm', target_language: 'es' });
    expect(trRes.status).toBe(200);
    expect(trRes.body.translated).toContain('Hola');

    // CRDT sync-batch
    mockPrisma.messages.findUnique.mockResolvedValue(null);
    mockPrisma.blocks.findFirst.mockResolvedValue(null);
    mockPrisma.blocks.findMany.mockResolvedValue([]);
    mockPrisma.messages.create.mockResolvedValue({ id: 900n });
    mockPrisma.messages.findMany.mockResolvedValue([]);

    const syncRes = await request(app)
      .post('/api/messages/sync-batch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        last_sync_at: new Date(Date.now() - 60_000).toISOString(),
        messages: [{ uuid: 'offline-uuid-1', recipient_id: 20, content: 'Sent on subway', type: 'text' }],
      });
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.synced_uuids).toEqual(['offline-uuid-1']);

    // Merchant CSV export
    mockPrisma.merchant_profiles.findUnique.mockResolvedValue({ id: 3n, business_name: 'Velvet Lounge', verification_status: 'verified' });
    mockPrisma.autonomous_settings.findUnique.mockResolvedValue({ value: '[]' });
    mockPrisma.promotion_events.count.mockResolvedValue(12);
    mockPrisma.merchant_payments.aggregate.mockResolvedValue({ _sum: { amount: 150 } });

    const csvRes = await request(app)
      .get('/api/merchant-portal/analytics/export?range=30d')
      .set('Authorization', `Bearer ${userToken}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('KPI_SUMMARY');
    expect(csvRes.text).toContain('Velvet Lounge (30d)');
  });
});
