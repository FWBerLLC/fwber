import { jest } from '@jest/globals';
import crypto from 'crypto';

const mockGet = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: { get: mockGet }
}));

jest.unstable_mockModule('../src/lib/ssrf.js', () => ({
  getHardenedFederationAgent: jest.fn().mockImplementation(async (url) => undefined),
  validateFederationUrl: jest.fn().mockImplementation(async (url) => true)
}));

describe('FederationService - Http Signature', () => {
  let federationService: any;
  let keyPair: { publicKey: string, privateKey: string };
  let FederationServiceModule: any;

  beforeAll(async () => {
    FederationServiceModule = await import('../src/services/FederationService.js');
    const generated = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    keyPair = generated;
  });

  beforeEach(() => {
    federationService = new FederationServiceModule.FederationService();
    jest.clearAllMocks();
  });

  it('should verify a valid HTTP signature', async () => {
    const keyId = 'https://remote.example.com/actor#main-key';

    // Mock axios to return the public key
    mockGet.mockResolvedValue({
      data: { publicKey: { publicKeyPem: keyPair.publicKey } }
    });

    const reqMethod = 'POST';
    const reqUrl = '/api/federation/inbox/1';
    const reqDate = new Date().toUTCString();
    const reqHost = 'api.fwber.online';

    const stringToSign = `(request-target): ${reqMethod.toLowerCase()} ${reqUrl}\nhost: ${reqHost}\ndate: ${reqDate}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(stringToSign);
    const signature = signer.sign(keyPair.privateKey, 'base64');

    const signatureHeader = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date",signature="${signature}"`;

    const req = {
      method: reqMethod,
      originalUrl: reqUrl,
      headers: {
        host: reqHost,
        date: reqDate,
        signature: signatureHeader
      }
    };

    const isValid = await federationService.verifyHttpSignature(req);
    expect(isValid).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(keyId, expect.any(Object));
  });

  it('should fail on invalid signature', async () => {
      const keyId = 'https://remote.example.com/actor#main-key';

      // Mock axios to return the public key
      mockGet.mockResolvedValue({
        data: { publicKey: { publicKeyPem: keyPair.publicKey } }
      });

      const reqMethod = 'POST';
      const reqUrl = '/api/federation/inbox/1';
      const reqDate = new Date().toUTCString();
      const reqHost = 'api.fwber.online';

      const stringToSign = `(request-target): ${reqMethod.toLowerCase()} ${reqUrl}\nhost: ${reqHost}\ndate: ${reqDate}`;

      const signer = crypto.createSign('RSA-SHA256');
      signer.update(stringToSign);
      // Tamper with the signature
      const signature = signer.sign(keyPair.privateKey, 'base64').substring(0, 10) + "tampered";

      const signatureHeader = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date",signature="${signature}"`;

      const req = {
        method: reqMethod,
        originalUrl: reqUrl,
        headers: {
          host: reqHost,
          date: reqDate,
          signature: signatureHeader
        }
      };

      const isValid = await federationService.verifyHttpSignature(req);
      expect(isValid).toBe(false);
  });
});
