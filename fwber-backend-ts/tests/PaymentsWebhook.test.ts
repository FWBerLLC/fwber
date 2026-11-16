import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';
import Stripe from 'stripe';

// Stripe webhook signature verification must run over the exact raw bytes.
// index.ts stashes them on req._rawBody inside the express.json() verify
// hook; if the route ever verifies against the parsed object again, every
// real Stripe event 400s. These tests sign a real payload offline and pin
// both the happy path and the bad-signature path.

process.env.STRIPE_SECRET_KEY = 'sk_test_offline_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_test_secret';

const mockUsersUpdate = jest.fn(async () => ({}));

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    users: { update: mockUsersUpdate },
  },
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

const { default: paymentsRoutes } = await import('../src/routes/payments.js');

function buildApp() {
  const app = express();
  // Mirror src/index.ts: stash the raw body before JSON parsing.
  app.use(express.json({ verify: (req: any, _res, buf) => { req._rawBody = buf; } }));
  app.use('/api/payments', paymentsRoutes);
  return app;
}

const stripe = new Stripe('sk_test_offline_dummy', { apiVersion: '2025-01-27' as any });

function signedRequest(payloadObj: unknown, secret = 'whsec_offline_test_secret') {
  const payload = JSON.stringify(payloadObj);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return { payload, header };
}

describe('POST /api/payments/webhook', () => {
  beforeEach(() => mockUsersUpdate.mockClear());

  it('accepts a correctly signed checkout.session.completed over the raw body', async () => {
    const { payload, header } = signedRequest({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', metadata: { userId: '42' } } },
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(mockUsersUpdate).toHaveBeenCalledWith({
      where: { id: 42n },
      data: { token_balance: { increment: 100 } },
    });
  });

  it('rejects a bad signature with 400 and credits nothing', async () => {
    const { payload } = signedRequest({
      id: 'evt_test_2',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_2', metadata: { userId: '42' } } },
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .send(payload);

    expect(res.status).toBe(400);
    expect(mockUsersUpdate).not.toHaveBeenCalled();
  });
});
