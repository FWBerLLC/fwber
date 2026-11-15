import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const emittedEvents: Array<{ room: string; event: string; payload: any }> = [];
const mockIo: any = {
  engine: { clientsCount: 3 },
  to: jest.fn((room: string) => ({
    emit: jest.fn((event: string, payload: any) => {
      emittedEvents.push({ room, event, payload });
    }),
  })),
};

const autonomousSettingsStore = new Map<string, string>();
let twoFactorRecoveryStore: string[] = ['RECOV-1111', 'RECOV-2222'];
const totpSecret = authenticator.generateSecret();
const passwordHash = bcrypt.hashSync('CorrectHorseBatteryStaple!1', 4);

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  blocks: {
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  video_calls: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  autonomous_settings: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  autonomous_actions: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({})),
  },
  topics: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  feedback: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  messages: {
    create: jest.fn(),
    count: jest.fn(),
  },
  matches: {
    count: jest.fn(),
  },
  profile_views: {
    count: jest.fn(),
  },
  reports: {
    count: jest.fn(),
  },
  moderation_actions: {
    count: jest.fn(),
  },
  proximity_artifacts: {
    count: jest.fn(),
  },
  shadow_throttles: {
    count: jest.fn(),
  },
  geo_spoof_detections: {
    count: jest.fn(),
  },
  failed_jobs: {
    count: jest.fn(),
  },
  slow_requests: {
    count: jest.fn(async () => 0),
  },
  chatrooms: {
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
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
  serialize: (obj: any) =>
    JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))),
  sanitizeUser: (u: any) => {
    if (!u) return u;
    const copy = { ...u };
    if ('two_factor_confirmed_at' in copy || 'two_factor_enabled' in copy) {
      copy.two_factor_enabled = Boolean(copy.two_factor_enabled ?? copy.two_factor_confirmed_at);
    }
    delete copy.password;
    delete copy.two_factor_secret;
    delete copy.two_factor_recovery_codes;
    return JSON.parse(JSON.stringify(copy, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
  },
}));

jest.unstable_mockModule('../src/socket.js', () => ({
  getIO: jest.fn(() => mockIo),
  initSocket: jest.fn(),
  pushNotification: jest.fn(),
}));

jest.unstable_mockModule('../src/lib/wingman-ai.js', () => ({
  generateText: jest.fn(async () =>
    JSON.stringify([
      { content: 'Anyone up for late-night espresso downtown?', tone: 'casual' },
      { content: 'Best rooftop view in the neighborhood?', tone: 'curious' },
    ]),
  ),
}));

const { default: authRoutes, twoFactorRouter } = await import('../src/routes/auth.js');
const { default: userRoutes } = await import('../src/routes/user.js');
const { default: videoRoutes } = await import('../src/routes/video.js');
const { default: configRoutes } = await import('../src/routes/config.js');
const { default: healthRoutes } = await import('../src/routes/health.js');
const { default: rateLimitsRoutes } = await import('../src/routes/rate-limits.js');
const { default: analyticsRoutes } = await import('../src/routes/analytics.js');
const { default: contentGenerationRoutes } = await import('../src/routes/content-generation.js');
const { default: feedbackRoutes } = await import('../src/routes/feedback.js');
const { default: websocketRoutes } = await import('../src/routes/websocket.js');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const modToken = jwt.sign({ id: 1, email: 'mod@fwber.online', role: 'moderator' }, JWT_SECRET, { expiresIn: '1h' });
const aliceToken = jwt.sign({ id: 10, email: 'alice@fwber.online', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
const bobToken = jwt.sign({ id: 20, email: 'bob@fwber.online', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
const malloryToken = jwt.sign({ id: 30, email: 'mallory@fwber.online', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/two-factor-challenge', twoFactorRouter);
  app.use('/api/user', userRoutes);
  app.use('/api/video', videoRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/rate-limits', rateLimitsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/content-generation', contentGenerationRoutes);
  app.use('/api/content', contentGenerationRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/websocket', websocketRoutes);
  return app;
}

describe('v2.3.93 Full-Stack Parity: TOTP 2FA Enforcement, WebRTC Video Signaling, Admin Config & Realtime Bridge', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    emittedEvents.length = 0;
    twoFactorRecoveryStore = ['RECOV-1111', 'RECOV-2222'];

    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => {
      if (where?.email === 'alice@fwber.online' || Number(where?.id) === 10) {
        return {
          id: 10n,
          name: 'Alice',
          email: 'alice@fwber.online',
          password: passwordHash,
          role: 'user',
          email_verified_at: new Date(),
          two_factor_secret: totpSecret,
          two_factor_confirmed_at: new Date('2026-11-01T00:00:00Z'),
          two_factor_recovery_codes: JSON.stringify(twoFactorRecoveryStore),
          user_profiles: [{ display_name: 'Alice' }],
        };
      }
      if (Number(where?.id) === 1) {
        return {
          id: 1n,
          name: 'Moderator',
          email: 'mod@fwber.online',
          role: 'moderator',
          is_moderator: true,
        };
      }
      if (Number(where?.id) === 20) {
        return {
          id: 20n,
          name: 'Bob',
          email: 'bob@fwber.online',
          role: 'user',
          two_factor_confirmed_at: null,
        };
      }
      if (Number(where?.id) === 30) {
        return {
          id: 30n,
          name: 'Mallory',
          email: 'mallory@fwber.online',
          role: 'user',
        };
      }
      return null;
    });

    mockPrisma.users.update.mockImplementation(async ({ where, data }: any) => {
      if (Number(where?.id) === 10 && typeof data?.two_factor_recovery_codes === 'string') {
        twoFactorRecoveryStore = JSON.parse(data.two_factor_recovery_codes);
      }
      return { id: where.id, ...data };
    });

    mockPrisma.blocks.findFirst.mockResolvedValue(null);
    mockPrisma.autonomous_settings.findMany.mockImplementation(async () =>
      Array.from(autonomousSettingsStore.entries()).map(([key, value]) => ({ key, value })),
    );
    mockPrisma.autonomous_settings.upsert.mockImplementation(async ({ where, update, create }: any) => {
      const val = update?.value ?? create?.value;
      autonomousSettingsStore.set(where.key, val);
      return { key: where.key, value: val };
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ Variable_name: 'Threads_connected', Value: '6' }]);
  });

  it('enforces TOTP 2FA on login, rejects pre-2FA tokens on protected routes, verifies TOTP & single-use recovery codes, and blocks JTI replay', async () => {
    // 1. Password login must NOT return a session token when two_factor_confirmed_at is set
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@fwber.online', password: 'CorrectHorseBatteryStaple!1' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.two_factor).toBe(true);
    expect(loginRes.body.token).toBeUndefined();
    expect(typeof loginRes.body.two_factor_token).toBe('string');

    const challengeToken = loginRes.body.two_factor_token;

    // 2. Domain-separated challenge JWT must be rejected by authenticate middleware (401/403)
    const bypassAttempt = await request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${challengeToken}`);
    expect([401, 403]).toContain(bypassAttempt.status);

    // 3. Invalid 6-digit code fails with 422 without burning the challenge token
    const badCodeRes = await request(app)
      .post('/api/auth/two-factor-challenge')
      .send({ two_factor_token: challengeToken, code: '000000' });
    expect(badCodeRes.status).toBe(422);

    // 4. Valid TOTP code completes login and sanitizes secrets while setting two_factor_enabled
    const validTotp = authenticator.generate(totpSecret);
    const verifyRes = await request(app)
      .post('/api/auth/two-factor-challenge')
      .send({ two_factor_token: challengeToken, code: validTotp });

    expect(verifyRes.status).toBe(200);
    expect(typeof verifyRes.body.token).toBe('string');
    expect(verifyRes.body.user.two_factor_enabled).toBe(true);
    expect(verifyRes.body.user.two_factor_secret).toBeUndefined();
    expect(verifyRes.body.user.two_factor_recovery_codes).toBeUndefined();

    // 5. Replaying the consumed challenge token JTI is rejected
    const replayRes = await request(app)
      .post('/api/auth/two-factor-challenge')
      .send({ two_factor_token: challengeToken, code: validTotp });
    expect(replayRes.status).toBe(401);

    // 6. Single-use emergency recovery code works via /api/two-factor-challenge and burns the consumed code
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@fwber.online', password: 'CorrectHorseBatteryStaple!1' });
    const recoveryRes = await request(app)
      .post('/api/two-factor-challenge')
      .send({ two_factor_token: secondLogin.body.two_factor_token, recovery_code: 'RECOV-1111' });

    expect(recoveryRes.status).toBe(200);
    expect(typeof recoveryRes.body.token).toBe('string');
    expect(twoFactorRecoveryStore).toEqual(['RECOV-2222']);
  });

  it('initiates video calls with { recipient_id }, enforces block & participant guards, and relays WebRTC SDP/ICE signals', async () => {
    mockPrisma.video_calls.create.mockResolvedValue({
      id: 99n,
      caller_id: 10n,
      receiver_id: 20n,
      status: 'ringing',
      created_at: new Date(),
    });
    mockPrisma.video_calls.findUnique.mockResolvedValue({
      id: 99n,
      caller_id: 10n,
      receiver_id: 20n,
      status: 'ringing',
    });
    mockPrisma.video_calls.update.mockImplementation(async ({ data }: any) => ({
      id: 99n,
      caller_id: 10n,
      receiver_id: 20n,
      ...data,
    }));

    // 1. Frontend contract { recipient_id } succeeds and emits video_call_incoming to user:20
    const initRes = await request(app)
      .post('/api/video/initiate')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipient_id: 20 });
    expect(initRes.status).toBe(201);
    expect(initRes.body.receiver_id).toBe(20);
    expect(emittedEvents.some((e) => e.room === 'user:20' && e.event === 'video_call_incoming')).toBe(true);

    // 2. Self-call rejected with 400
    const selfRes = await request(app)
      .post('/api/video/initiate')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipient_id: 10 });
    expect(selfRes.status).toBe(400);

    // 3. Non-participant Mallory cannot mutate call status (403)
    const malloryStatus = await request(app)
      .put('/api/video/99/status')
      .set('Authorization', `Bearer ${malloryToken}`)
      .send({ status: 'ended' });
    expect(malloryStatus.status).toBe(403);

    // 4. Receiver Bob can accept call (200)
    const bobAccept = await request(app)
      .put('/api/video/99/status')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ status: 'connected' });
    expect(bobAccept.status).toBe(200);

    // 5. Third-party Mallory cannot spoof WebRTC offer into call #99 (403)
    const spoofSignal = await request(app)
      .post('/api/video/signal')
      .set('Authorization', `Bearer ${malloryToken}`)
      .send({ to_user_id: 20, call_id: 99, type: 'offer', signal: { type: 'offer', sdp: 'v=0...' } });
    expect(spoofSignal.status).toBe(403);

    // 6. Alice relays SDP offer to Bob over user:20
    const offerRes = await request(app)
      .post('/api/video/signal')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ to_user_id: 20, call_id: 99, type: 'offer', signal: { type: 'offer', sdp: 'v=0...' } });
    expect(offerRes.status).toBe(200);
    expect(offerRes.body.success).toBe(true);
    expect(
      emittedEvents.some(
        (e) =>
          e.room === 'user:20' &&
          e.event === 'VideoCallSignal' &&
          e.payload.from_user_id === '10' &&
          e.payload.signal.type === 'offer',
      ),
    ).toBe(true);

    // 7. GET /api/video/history exposes caller, receiver, AND other_user so CallHistory UI never renders "Unknown User"
    mockPrisma.video_calls.findMany.mockResolvedValueOnce([
      {
        id: 99n,
        caller_id: 10n,
        receiver_id: 20n,
        status: 'ended',
        duration: 42,
        started_at: new Date('2026-11-15T12:00:00Z'),
        ended_at: new Date('2026-11-15T12:00:42Z'),
        created_at: new Date('2026-11-15T12:00:00Z'),
        users_video_calls_caller_idTousers: {
          id: 10n,
          name: 'Alice',
          user_profiles: [{ display_name: 'Alice Wonderland', avatar_url: '/uploads/alice.png' }],
        },
        users_video_calls_receiver_idTousers: {
          id: 20n,
          name: 'Bob',
          user_profiles: [{ display_name: 'Bob Builder', avatar_url: '/uploads/bob.png' }],
        },
      },
    ]);
    const histRes = await request(app)
      .get('/api/video/history')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.data).toHaveLength(1);
    expect(histRes.body.data[0].caller.name).toBe('Alice Wonderland');
    expect(histRes.body.data[0].receiver.name).toBe('Bob Builder');
    expect(histRes.body.data[0].other_user.name).toBe('Bob Builder');
    expect(histRes.body.data[0].direction).toBe('outgoing');
  });

  it('persists admin runtime feature flags, exposes config health, infra metrics, rate-limit stats, and platform analytics', async () => {
    // Non-operator rejected on PUT /api/config/features
    const forbiddenUpdate = await request(app)
      .put('/api/config/features')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ local_media_vault: false });
    expect(forbiddenUpdate.status).toBe(403);

    // Moderator updates feature flag + moderation_driver
    const modUpdate = await request(app)
      .put('/api/config/features')
      .set('Authorization', `Bearer ${modToken}`)
      .send({ local_media_vault: false, moderation_driver: 'google' });
    expect(modUpdate.status).toBe(200);
    expect(modUpdate.body.features.local_media_vault).toBe(false);
    expect(modUpdate.body.moderation_driver).toBe('google');

    // GET /api/config/health returns SystemHealth shape
    const cfgHealth = await request(app).get('/api/config/health');
    expect(cfgHealth.status).toBe(200);
    expect(cfgHealth.body.services.reverb).toBe('up');
    expect(cfgHealth.body.services.cache).toBeDefined();

    // GET /api/health/metrics returns redis & database thread telemetry
    const metricsRes = await request(app).get('/api/health/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.redis.used_memory_human).toBeDefined();
    expect(metricsRes.body.database.threads_connected).toBe(1);

    // GET /api/rate-limits/stats/1h requires authentication and returns limiter telemetry
    const rlUnauth = await request(app).get('/api/rate-limits/stats/1h');
    expect(rlUnauth.status).toBe(401);

    const rlOk = await request(app)
      .get('/api/rate-limits/stats/1h')
      .set('Authorization', `Bearer ${modToken}`);
    expect(rlOk.status).toBe(200);
    expect(rlOk.body.timeframe).toBe('1h');
    expect(rlOk.body.statistics).toBeDefined();

    // GET /api/analytics?range=30d returns PlatformAnalyticsResponse
    mockPrisma.users.count.mockResolvedValue(120);
    mockPrisma.messages.count.mockResolvedValue(850);
    mockPrisma.matches.count.mockResolvedValue(45);
    mockPrisma.profile_views.count.mockResolvedValue(600);
    mockPrisma.topics.count.mockResolvedValue(8);
    mockPrisma.topics.findMany.mockResolvedValue([{ id: 1n, label: 'Downtown', updated_at: new Date() }]);
    mockPrisma.chatrooms.count.mockResolvedValue(4);
    mockPrisma.feedback.count.mockResolvedValue(10);
    mockPrisma.feedback.findMany.mockResolvedValue([
      { category: 'feature', sentiment: 'positive' },
      { category: 'bug', sentiment: 'negative' },
    ]);
    mockPrisma.reports.count.mockResolvedValue(2);
    mockPrisma.moderation_actions.count.mockResolvedValue(5);
    mockPrisma.failed_jobs.count.mockResolvedValue(0);

    const analyticsRes = await request(app)
      .get('/api/analytics?range=30d')
      .set('Authorization', `Bearer ${modToken}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.users.total).toBe(120);
    expect(analyticsRes.body.feedback.sentiment.positive).toBeGreaterThanOrEqual(1);
    expect(analyticsRes.body.performance.cache_hit_rate).toBeDefined();
  });

  it('serves AI board post generation, content deletion, paginated feedback triage, and block-guarded WebSocket HTTP bridge', async () => {
    mockPrisma.topics.findUnique.mockResolvedValue({ id: 5n, label: 'Nightlife Scene' });

    const genPosts = await request(app)
      .post('/api/content/generate-posts/5')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ context: { time: 'evening' } });
    expect(genPosts.status).toBe(200);
    expect(Array.isArray(genPosts.body.data.suggestions)).toBe(true);
    expect(genPosts.body.data.suggestions.length).toBeGreaterThan(0);

    const delContent = await request(app)
      .delete('/api/content-generation/content/gen_123')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(delContent.status).toBe(200);

    // Paginated feedback triage for moderator
    mockPrisma.feedback.count.mockResolvedValue(1);
    mockPrisma.feedback.findMany.mockResolvedValue([
      {
        id: 7n,
        user_id: 10n,
        category: 'feature',
        message: 'Love the new video call UI!',
        status: 'new',
        sentiment: 'positive',
        is_analyzed: true,
        created_at: new Date(),
        users: { name: 'Alice', email: 'alice@fwber.online' },
      },
    ]);
    mockPrisma.feedback.findUnique.mockResolvedValue({ id: 7n, user_id: 10n, status: 'new' });
    mockPrisma.feedback.update.mockResolvedValue({ id: 7n, user_id: 10n, status: 'resolved' });

    const fbPage = await request(app)
      .get('/api/feedback?page=1')
      .set('Authorization', `Bearer ${modToken}`);
    expect(fbPage.status).toBe(200);
    expect(fbPage.body.current_page).toBe(1);
    expect(fbPage.body.data).toHaveLength(1);

    const fbResolve = await request(app)
      .put('/api/feedback/7')
      .set('Authorization', `Bearer ${modToken}`)
      .send({ status: 'resolved' });
    expect(fbResolve.status).toBe(200);
    expect(fbResolve.body.data.status).toBe('resolved');

    // WebSocket HTTP bridge enforces bidirectional blocks on POST /api/websocket/message
    mockPrisma.blocks.findFirst.mockResolvedValueOnce({ id: 1n });
    const blockedWsMsg = await request(app)
      .post('/api/websocket/message')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipient_id: 20, content: 'Hello' });
    expect(blockedWsMsg.status).toBe(403);

    mockPrisma.blocks.findFirst.mockResolvedValueOnce(null);
    mockPrisma.messages.create.mockResolvedValue({
      id: 501n,
      sender_id: 10n,
      receiver_id: 20n,
      content: 'Hey Bob!',
      message_type: 'text',
      sent_at: new Date(),
      created_at: new Date(),
    });
    const okWsMsg = await request(app)
      .post('/api/websocket/message')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipient_id: 20, content: 'Hey Bob!' });
    expect(okWsMsg.status).toBe(201);
    expect(emittedEvents.some((e) => e.room === 'user:20' && e.event === 'new_message')).toBe(true);
  });
});
