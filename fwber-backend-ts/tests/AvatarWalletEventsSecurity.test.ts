import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const tmpUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwber-avatar-test-'));
process.env.UPLOAD_DIR = tmpUploadDir;

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user_profiles: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  photos: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  blocks: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  wallet_transactions: {
    create: jest.fn(),
  },
  payment_requests: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  merchant_payments: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  proximity_artifacts: {
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  push_subscriptions: {
    upsert: jest.fn(),
  },
  events: {
    findUnique: jest.fn(),
  },
  event_invitations: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  event_attendees: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  group_members: {
    findMany: jest.fn(),
  },
  vouches: {
    create: jest.fn(),
  },
  viral_contents: {
    create: jest.fn(),
  },
  safe_walks: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  security_events: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
  serialize: (val: any) => val,
  sanitizeUser: (user: any) => user,
}));

jest.unstable_mockModule('../src/lib/wingman-ai.js', () => ({
  generateText: jest.fn(async () => ''),
  generateAvatarImage: jest.fn(async () => ''),
  generatePublicRoast: jest.fn(async () => ''),
  generateRoast: jest.fn(async () => ''),
  generateVibeCheck: jest.fn(async () => ({ green_flags: ['Genuine'], red_flags: ['None'] })),
  generateQuirkCheck: jest.fn(async () => ({ flag_type: 'Green Flag', reason: 'Fun', emoji: '✨' })),
  generateCosmicMatch: jest.fn(async () => ({ best_match: 'Leo', best_reason: 'Spark', worst_match: 'None', worst_reason: 'N/A' })),
  generateNemesis: jest.fn(async () => ({ nemesis_type: 'Flake', clashing_traits: [], why_it_would_fail: 'Timing', scientific_explanation: 'Physics' })),
  generateFortune: jest.fn(async () => ({ fortune: 'Great week ahead.' })),
  generateProfileAnalysis: jest.fn(async () => ({
    score: 86,
    strengths: ['Warm humor', 'Specific hobbies'],
    weaknesses: ['Add one local date spot'],
    tips: ['End with an easy two-choice prompt'],
  })),
}));

const { default: avatarRoutes } = await import('../src/routes/avatar.js');
const { default: walletRoutes } = await import('../src/routes/wallet.js');
const { default: merchantRoutes } = await import('../src/routes/merchant.js');
const { default: notificationRoutes } = await import('../src/routes/notifications.js');
const { default: eventsRoutes } = await import('../src/routes/events.js');
const { default: publicRoutes } = await import('../src/routes/public.js');
const { default: wingmanRoutes } = await import('../src/routes/wingman.js');
const { default: profileRoutes } = await import('../src/routes/profile.js');
const { default: settingsRoutes } = await import('../src/routes/settings.js');
const { default: safetyRoutes } = await import('../src/routes/safety.js');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function makeAuthHeader(userId = 42) {
  const token = jwt.sign({ id: userId, email: 'member@fwber.online' }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return `Bearer ${token}`;
}

const app = express();
app.use(express.json());
app.use('/api/avatar', avatarRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/wingman', wingmanRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/safety', safetyRoutes);

afterAll(() => {
  try {
    fs.rmSync(tmpUploadDir, { recursive: true, force: true });
  } catch {}
});

describe('v2.3.91 Full-Stack Consolidation: Avatar Studio, Wallet P2P/Requests, Merchant Checkout, Events, Vouches & Security', () => {
  let defaultPasswordHash = '';

  beforeEach(async () => {
    jest.clearAllMocks();
    if (!defaultPasswordHash) {
      defaultPasswordHash = await bcrypt.hash('OldPass123!', 10);
    }
    mockPrisma.notifications.create.mockResolvedValue({ id: 1n });
    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => {
      const uid = where?.id ?? 42n;
      if (uid === 77n) {
        return {
          id: 77n,
          name: 'Aria',
          email: 'aria@fwber.online',
          role: 'user',
          token_balance: 120,
          wallet_address: 'So11111111111111111111111111111111111111112',
          user_profiles: [{ display_name: 'Aria' }],
        };
      }
      return {
        id: uid,
        name: 'Nova',
        email: 'member@fwber.online',
        role: 'user',
        is_moderator: false,
        is_decoy: false,
        decoy_user_id: null,
        decoy_password: null,
        password: defaultPasswordHash,
        token_balance: 200,
        wallet_address: 'FwB1111111111111111111111111111111111111111',
        user_profiles: [{ display_name: 'Nova', avatar_url: null }],
      };
    });
  });

  describe('AI Avatar Studio (/api/avatar)', () => {
    it('returns configured providers including local_studio availability', async () => {
      const res = await request(app)
        .get('/api/avatar/providers')
        .set('Authorization', makeAuthHeader());
      expect(res.status).toBe(200);
      expect(res.body.providers.local_studio.available).toBe(true);
    });

    it('synthesizes an SVG studio portrait and registers a photos row when cloud keys are absent', async () => {
      mockPrisma.user_profiles.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user_profiles.findFirst.mockResolvedValue({
        display_name: 'Nova',
        skin_tone: 'olive',
        hair_color: 'black',
        eye_color: 'green',
        gender: 'female',
      });
      mockPrisma.photos.create.mockResolvedValue({ id: 901n });

      const res = await request(app)
        .post('/api/avatar/generate')
        .set('Authorization', makeAuthHeader())
        .send({
          style: 'neon',
          gender: 'female',
          hair_color: 'black',
          eye_color: 'green',
        });

      expect(res.status).toBe(200);
      expect(res.body.avatar_url).toMatch(/^\/uploads\/avatars\/avatar-42-.*\.svg$/);
      expect(res.body.photo_id).toBe(901);
      expect(mockPrisma.photos.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Wallet Transfers & Payment Requests (/api/wallet)', () => {
    it('blocks P2P transfers when a bidirectional block exists (403)', async () => {
      mockPrisma.blocks.findFirst.mockResolvedValueOnce({ id: 5n });

      const res = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', makeAuthHeader(42))
        .send({ recipient_id: 77, amount: 25 });

      expect(res.status).toBe(403);
    });

    it('executes atomic P2P transfer when balance is sufficient', async () => {
      mockPrisma.blocks.findFirst.mockResolvedValueOnce(null);
      mockPrisma.users.update.mockResolvedValue({});
      mockPrisma.wallet_transactions.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', makeAuthHeader(42))
        .send({ recipient_id: 77, amount: 50, message: 'Drinks!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.recipient_id).toBe(77);
      expect(mockPrisma.wallet_transactions.create).toHaveBeenCalledTimes(2);
    });

    it('returns { incoming, outgoing } arrays on GET /api/wallet/requests and settles POST /requests/:id/pay', async () => {
      mockPrisma.payment_requests.findMany
        .mockResolvedValueOnce([
          {
            id: 12n,
            amount: 30,
            note: 'Concert split',
            status: 'pending',
            users_payment_requests_requester_idTousers: { id: 88n, name: 'Kai', email: 'kai@fwber.online' },
            created_at: new Date(),
          },
        ])
        .mockResolvedValueOnce([]);

      const listRes = await request(app)
        .get('/api/wallet/requests')
        .set('Authorization', makeAuthHeader(42));
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.incoming)).toBe(true);
      expect(Array.isArray(listRes.body.outgoing)).toBe(true);
      expect(listRes.body.incoming[0].requester.name).toBe('Kai');

      mockPrisma.payment_requests.findUnique.mockResolvedValueOnce({
        id: 12n,
        requester_id: 88n,
        payer_id: 42n,
        amount: 30,
        note: 'Concert split',
        status: 'pending',
      });
      mockPrisma.payment_requests.update.mockResolvedValueOnce({});

      const payRes = await request(app)
        .post('/api/wallet/requests/12/pay')
        .set('Authorization', makeAuthHeader(42));
      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('paid');
    });
  });

  describe('Merchant Keys & Hosted Checkout (/api/merchant)', () => {
    it('serves GET /api/merchant/payment/:id unauthenticated and settles POST /confirm atomically', async () => {
      mockPrisma.merchant_payments.findUnique.mockResolvedValueOnce({
        id: 'inv-123',
        merchant_id: 99n,
        amount: 45,
        description: 'VIP Lounge Pass',
        status: 'pending',
        redirect_url: 'https://fwber.online/events',
        users_merchant_payments_merchant_idTousers: { id: 99n, name: 'Club Neon', merchant_name: 'Club Neon Detroit' },
      });

      const getRes = await request(app).get('/api/merchant/payment/inv-123');
      expect(getRes.status).toBe(200);
      expect(getRes.body.merchant_name).toBe('Club Neon Detroit');
      expect(getRes.body.payment.amount).toBe('45.00');

      mockPrisma.merchant_payments.findUnique.mockResolvedValueOnce({
        id: 'inv-123',
        merchant_id: 99n,
        amount: 45,
        description: 'VIP Lounge Pass',
        status: 'pending',
        redirect_url: 'https://fwber.online/events',
      });
      mockPrisma.merchant_payments.update.mockResolvedValueOnce({});

      const confirmRes = await request(app)
        .post('/api/merchant/payment/inv-123/confirm')
        .set('Authorization', makeAuthHeader(42));
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.status).toBe('paid');
    });

    it('rotates merchant API secret via POST /api/merchant/keys', async () => {
      mockPrisma.users.update.mockResolvedValueOnce({
        merchant_secret: 'mch_testsecret123',
        merchant_name: 'Velvet Room',
      });
      const res = await request(app)
        .post('/api/merchant/keys')
        .set('Authorization', makeAuthHeader(42))
        .send({ merchant_name: 'Velvet Room' });
      expect(res.status).toBe(200);
      expect(res.body.merchant_secret).toBe('mch_testsecret123');
    });
  });

  describe('Notifications, Events, Public Vouches & Wingman POSTs', () => {
    it('marks single and all notifications read and saves push subscriptions', async () => {
      mockPrisma.notifications.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.push_subscriptions.upsert.mockResolvedValue({ id: 1n });

      const readOne = await request(app)
        .post('/api/notifications/55/read')
        .set('Authorization', makeAuthHeader(42));
      expect(readOne.status).toBe(200);
      expect(mockPrisma.notifications.updateMany).toHaveBeenCalled();

      const readAll = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', makeAuthHeader(42));
      expect(readAll.status).toBe(200);

      const subRes = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', makeAuthHeader(42))
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'k1', auth: 'a1' } });
      expect(subRes.status).toBe(200);
      expect(subRes.body.success).toBe(true);
    });

    it('invites users to events, returns inviter.name, and auto-RSVPs on accepted invitation', async () => {
      mockPrisma.events.findUnique.mockResolvedValueOnce({ id: 10n, title: 'Rooftop Mixer' });
      mockPrisma.blocks.findMany.mockResolvedValueOnce([]);
      mockPrisma.event_invitations.findFirst.mockResolvedValueOnce(null);
      mockPrisma.event_invitations.create.mockResolvedValueOnce({ id: 70n });

      const inviteRes = await request(app)
        .post('/api/events/10/invite')
        .set('Authorization', makeAuthHeader(42))
        .send({ user_id: 88 });
      expect(inviteRes.status).toBe(201);
      expect(inviteRes.body.invited_count).toBe(1);

      mockPrisma.event_invitations.findMany.mockResolvedValueOnce([
        {
          id: 70n,
          event_id: 10n,
          inviter_id: 42n,
          invitee_id: 88n,
          status: 'pending',
          created_at: new Date(),
          events: { id: 10n, title: 'Rooftop Mixer', location_name: 'SkyBar', starts_at: new Date(), users: { id: 42n } },
          users_event_invitations_inviter_idTousers: { id: 42n, name: 'Nova', user_profiles: [{ display_name: 'Nova' }] },
        },
      ]);
      const invListRes = await request(app)
        .get('/api/events/invitations')
        .set('Authorization', makeAuthHeader(88));
      expect(invListRes.status).toBe(200);
      expect(invListRes.body[0].inviter.name).toBe('Nova');

      mockPrisma.event_invitations.findUnique.mockResolvedValueOnce({
        id: 70n,
        event_id: 10n,
        inviter_id: 42n,
        invitee_id: 88n,
        status: 'pending',
      });
      mockPrisma.event_invitations.update.mockResolvedValueOnce({});
      mockPrisma.event_attendees.findFirst.mockResolvedValueOnce(null);
      mockPrisma.event_attendees.create.mockResolvedValueOnce({ id: 1n });

      const respondRes = await request(app)
        .post('/api/events/invitations/70/respond')
        .set('Authorization', makeAuthHeader(88))
        .send({ status: 'accepted' });
      expect(respondRes.status).toBe(200);
      expect(mockPrisma.event_attendees.create).toHaveBeenCalledTimes(1);
    });

    it('records public vouches by referral_code on POST /api/public/vouch', async () => {
      mockPrisma.users.findFirst.mockResolvedValueOnce({ id: 42n, name: 'Nova' });
      mockPrisma.vouches.create.mockResolvedValueOnce({ id: 301n });

      const res = await request(app)
        .post('/api/public/vouch')
        .send({
          referral_code: 'NOVA2026',
          type: 'safe',
          relationship_type: 'friend',
          comment: 'Super trustworthy!',
          voucher_name: 'Sam',
        });
      expect(res.status).toBe(201);
      expect(res.body.vouch_id).toBe(301);
    });

    it('serves POST /api/wingman/compatibility and POST /api/wingman/ice-breaker with fallback resilience', async () => {
      mockPrisma.user_profiles.findFirst.mockResolvedValue({ display_name: 'Nova', bio: 'Jazz and climbing' });
      mockPrisma.viral_contents.create.mockResolvedValue({});

      const compRes = await request(app)
        .post('/api/wingman/compatibility')
        .set('Authorization', makeAuthHeader(42))
        .send({});
      expect(compRes.status).toBe(200);
      expect(compRes.body.score).toBe(86);
      expect(Array.isArray(compRes.body.strengths)).toBe(true);

      const iceRes = await request(app)
        .post('/api/wingman/ice-breaker')
        .set('Authorization', makeAuthHeader(42))
        .send({ context: 'Loves bouldering and espresso' });
      expect(iceRes.status).toBe(200);
      expect(Array.isArray(iceRes.body.icebreakers)).toBe(true);
      expect(iceRes.body.icebreakers.length).toBeGreaterThan(0);
    });
  });

  describe('Profile Password, Recipient Wallet, Decoy Profile & Safety Panic', () => {
    it('updates password via PUT /api/profile/password and returns wallet address via GET /api/users/:id/wallet', async () => {
      mockPrisma.users.update.mockResolvedValueOnce({});

      const pwRes = await request(app)
        .put('/api/profile/password')
        .set('Authorization', makeAuthHeader(42))
        .send({
          current_password: 'OldPass123!',
          password: 'NewSecurePass456!',
          password_confirmation: 'NewSecurePass456!',
        });
      expect(pwRes.status).toBe(200);
      expect(pwRes.body.success).toBe(true);

      const walletRes = await request(app)
        .get('/api/users/77/wallet')
        .set('Authorization', makeAuthHeader(42));
      expect(walletRes.status).toBe(200);
      expect(walletRes.body.wallet_address).toBe('So11111111111111111111111111111111111111112');
    });

    it('rejects decoy password matching primary password and creates/detaches decoy profile cleanly', async () => {
      const samePwRes = await request(app)
        .post('/api/settings/decoy-profile')
        .set('Authorization', makeAuthHeader(42))
        .send({ decoy_password: 'OldPass123!' });
      expect(samePwRes.status).toBe(400);

      mockPrisma.users.create.mockResolvedValueOnce({ id: 999n });
      mockPrisma.user_profiles.create.mockResolvedValueOnce({ id: 1n });
      mockPrisma.users.update.mockResolvedValueOnce({});

      const createRes = await request(app)
        .post('/api/settings/decoy-profile')
        .set('Authorization', makeAuthHeader(42))
        .send({ decoy_password: 'DuressCoverPassword88!' });
      expect(createRes.status).toBe(200);
      expect(createRes.body.has_decoy_profile).toBe(true);
      expect(createRes.body.decoy_user_id).toBe(999);

      mockPrisma.users.update.mockResolvedValueOnce({});
      const delRes = await request(app)
        .delete('/api/settings/decoy-profile')
        .set('Authorization', makeAuthHeader(42));
      expect(delRes.status).toBe(200);
      expect(delRes.body.has_decoy_profile).toBe(false);
    });

    it('updates Safe Walk location, ends walk, and logs high-severity panic alert on POST /api/safety/panic', async () => {
      mockPrisma.safe_walks.findFirst.mockResolvedValueOnce({
        id: 15n,
        user_id: 42n,
        status: 'active',
        destination: 'Midtown Station',
      });
      mockPrisma.safe_walks.update.mockResolvedValueOnce({
        id: 15n,
        user_id: 42n,
        status: 'active',
        destination: 'Midtown Station',
        current_lat: 42.35,
        current_lng: -83.06,
        started_at: new Date(),
        ended_at: null,
      });

      const locRes = await request(app)
        .patch('/api/safety/walk/15/location')
        .set('Authorization', makeAuthHeader(42))
        .send({ latitude: 42.35, longitude: -83.06 });
      expect(locRes.status).toBe(200);
      expect(locRes.body.walk.current_lat).toBe(42.35);

      mockPrisma.safe_walks.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.user_profiles.findFirst.mockResolvedValueOnce({
        preferences: JSON.stringify({
          emergency_contacts: [{ id: 1, name: 'Jordan', phone: '+13135550199' }],
        }),
      });
      mockPrisma.security_events.create.mockResolvedValueOnce({ id: 500n });

      const panicRes = await request(app)
        .post('/api/safety/panic')
        .set('Authorization', makeAuthHeader(42))
        .send({ latitude: 42.35, longitude: -83.06 });
      expect(panicRes.status).toBe(200);
      expect(panicRes.body.status).toBe('alerted');
      expect(panicRes.body.alerts_sent).toBe(1);
      expect(panicRes.body.contacts_notified).toEqual(['Jordan']);
      expect(mockPrisma.security_events.create).toHaveBeenCalledTimes(1);
    });
  });
});
