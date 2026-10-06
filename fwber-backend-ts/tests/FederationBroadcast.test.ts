import { jest } from '@jest/globals';
import axios from 'axios';
import crypto from 'crypto';

// Setup mock objects and functions
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockPost = jest.fn();
const mockGet = jest.fn();

const mockPrisma = {
  users: {
    findUnique: mockFindUnique,
  },
  federation_follows: {
    findMany: mockFindMany,
  }
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockGet,
    post: mockPost
  }
}));

const { FederationService } = await import('../src/services/FederationService.js');

describe('FederationService - Broadcasting', () => {
  let federationService: FederationService;

  beforeEach(() => {
    jest.clearAllMocks();
    federationService = new FederationService();
  });

  it('should broadcast an update to all followers', async () => {
    const userId = 1n;
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    mockFindUnique.mockResolvedValue({
      id: userId,
      private_key: privateKey,
      name: 'testuser'
    });

    mockFindMany.mockResolvedValue([
      { actor_uri: 'https://remote.com/users/follower1' },
      { actor_uri: 'https://remote.com/users/follower2' }
    ]);

    mockGet.mockResolvedValue({
        data: { inbox: 'https://remote.com/inbox' }
    });

    mockPost.mockResolvedValue({ status: 202 });

    const payload = { type: 'Note', content: 'Hello Fediverse' };
    await federationService.broadcastUpdate(userId, payload);

    expect(mockFindUnique).toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenCalledTimes(2);

    // Verify signature header exists
    const lastCallHeaders = mockPost.mock.calls[0][2].headers;
    expect(lastCallHeaders).toHaveProperty('Signature');
    expect(lastCallHeaders.Signature).toContain('keyId="https://api.fwber.site/api/federation/actors/1#main-key"');
  });
});
