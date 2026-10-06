import { jest } from '@jest/globals';
import request from 'supertest';
import { CryptoService } from '../src/services/CryptoService.js';

const mockCreate = jest.fn().mockResolvedValue({ id: 9999n });
const mockFindUnique = jest.fn().mockResolvedValue({
  id: 9999n,
  name: 'FediverseTestUser',
  user_profiles: [{ display_name: 'Fediverse Display Name', bio: 'A test user for the fediverse' }],
  public_key: 'mock-public-key',
  private_key: 'mock-private-key'
});
const mockFindFirst = jest.fn().mockResolvedValue({
  id: 9999n,
  name: 'FediverseTestUser',
  user_profiles: [{ display_name: 'Fediverse Display Name', bio: 'A test user for the fediverse' }],
  public_key: 'mock-public-key',
  private_key: 'mock-private-key'
});

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    users: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn()
  },
  serialize: (obj: any) => obj,
  sanitizeUser: (obj: any) => obj,
}));


import { Router } from 'express';
jest.unstable_mockModule('../src/routes/wingman.js', () => {
    const mockRouter = Router();
    return {
        default: mockRouter
    }
});
const { default: app } = await import('../src/index.js');


describe('Federation Endpoints', () => {
  const testUser = {
    id: 9999n,
    name: 'FediverseTestUser',
    email: 'fediverse@example.com',
    password: 'password123',
    role: 'user',
    tier: 'free',
  };

  it('should resolve the user via WebFinger', async () => {
    const res = await request(app)
      .get(`/.well-known/webfinger?resource=acct:${testUser.name}@fwber.site`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('subject', `acct:${testUser.name}@fwber.site`);
    expect(res.body.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rel: 'self',
          type: 'application/activity+json',
          href: `https://api.fwber.site/api/federation/actors/${testUser.id}`
        })
      ])
    );
  });

  it('should return valid ActivityPub Actor JSON-LD', async () => {
    const res = await request(app)
      .get(`/api/federation/actors/${testUser.id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('type', 'Person');
    expect(res.body).toHaveProperty('preferredUsername', testUser.name);
    expect(res.body).toHaveProperty('name', 'Fediverse Display Name');
    expect(res.body).toHaveProperty('summary', 'A test user for the fediverse');
    expect(res.body).toHaveProperty('publicKey');
    expect(res.body.publicKey).toHaveProperty('publicKeyPem', 'mock-public-key');
  });
});
