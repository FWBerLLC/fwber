import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Premium initiate contract: the modal sent plan_id (and 'gold_monthly')
// while the route read only planId against monthly/yearly keys, so every
// card checkout silently became a monthly session, and the modal waited
// for a client_secret the Checkout-session route never returns. Route now
// accepts planId / plan_id / gold_* spellings; these tests pin the amounts.

process.env.STRIPE_SECRET_KEY = 'sk_test_offline_dummy';

const mockCreateSession = jest.fn(async (args: any) => ({ id: 'cs_test', url: 'https://checkout.stripe.com/test' }));

jest.unstable_mockModule('stripe', () => ({
  default: class MockStripe {
    checkout = { sessions: { create: mockCreateSession } };
    webhooks = { constructEvent: jest.fn() };
  },
}));

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: { users: { findUnique: jest.fn(async () => null), update: jest.fn(async () => ({})) } },
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: premiumRoutes } = await import('../src/routes/premium.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/premium', premiumRoutes);
  return app;
}

async function initiate(body: any) {
  mockCreateSession.mockClear();
  const res = await request(buildApp()).post('/api/premium/initiate').send(body);
  return { res, args: (mockCreateSession.mock.calls[0] as any)?.[0] };
}

describe('POST /api/premium/initiate', () => {
  it('canonical planId yearly charges the yearly amount', async () => {
    const { res, args } = await initiate({ planId: 'yearly' });
    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toContain('checkout.stripe.com');
    expect(args.line_items[0].price_data.unit_amount).toBe(14999);
    expect(args.metadata).toEqual({ userId: '42', type: 'premium_upgrade', planId: 'yearly' });
  });

  it('legacy plan_id spelling reaches the same yearly session', async () => {
    const { args } = await initiate({ plan_id: 'yearly' });
    expect(args.line_items[0].price_data.unit_amount).toBe(14999);
  });

  it("modal's gold_monthly spelling normalizes to monthly pricing", async () => {
    const { args } = await initiate({ planId: 'gold_monthly' });
    expect(args.line_items[0].price_data.unit_amount).toBe(1999);
    expect(args.metadata.planId).toBe('monthly');
  });

  it('unknown plan falls back to monthly', async () => {
    const { args } = await initiate({ planId: 'platinum-ultra' });
    expect(args.line_items[0].price_data.unit_amount).toBe(1999);
  });
});
