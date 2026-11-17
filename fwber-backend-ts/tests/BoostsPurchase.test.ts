import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Mirror src/index.ts bootstrap: BigInt serializes as Number in responses.
(BigInt.prototype as any).toJSON = function () { return Number(this); };

// Boost purchase contract: the live UI sent `payment_method` (snake_case)
// while the route only read `paymentMethod`, so every purchase from
// BoostPurchaseModal returned 400 Invalid payment method. The client now
// sends paymentMethod; the route accepts both spellings. These tests pin
// the token path under both spellings and the 400 for a missing method.

let balance = 1000;
const mockBoostCreate = jest.fn(async (args: any) => ({ id: 1n, ...args.data }));
const mockUserUpdate = jest.fn(async () => ({}));

const mockPrisma: any = {
  users: {
    findUnique: jest.fn(async () => ({ token_balance: balance })),
    update: mockUserUpdate,
  },
  wallet_transactions: { create: jest.fn(async () => ({})) },
  boosts: { create: mockBoostCreate },
  $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: boostsRoutes } = await import('../src/routes/boosts.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/boosts', boostsRoutes);
  return app;
}

describe('POST /api/boosts/purchase (token path)', () => {
  beforeEach(() => { balance = 1000; mockBoostCreate.mockClear(); mockUserUpdate.mockClear(); });

  it('accepts canonical paymentMethod and activates the boost', async () => {
    const res = await request(buildApp())
      .post('/api/boosts/purchase')
      .send({ type: 'standard', paymentMethod: 'token' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockBoostCreate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { token_balance: { decrement: 50 } } }),
    );
  });

  it('accepts legacy payment_method spelling identically', async () => {
    const res = await request(buildApp())
      .post('/api/boosts/purchase')
      .send({ type: 'super', payment_method: 'token' });
    expect(res.status).toBe(200);
    expect(mockBoostCreate).toHaveBeenCalledTimes(1);
    const arg = (mockBoostCreate.mock.calls[0] as any)[0];
    expect(arg.data.boost_type).toBe('super');
  });

  it('still 400s when no payment method is given at all', async () => {
    const res = await request(buildApp())
      .post('/api/boosts/purchase')
      .send({ type: 'standard' });
    expect(res.status).toBe(400);
    expect(mockBoostCreate).not.toHaveBeenCalled();
  });

  it('rejects insufficient balance without creating a boost', async () => {
    balance = 10;
    const res = await request(buildApp())
      .post('/api/boosts/purchase')
      .send({ type: 'standard', paymentMethod: 'token' });
    expect(res.status).toBe(400);
    expect(mockBoostCreate).not.toHaveBeenCalled();
  });
});
