import { jest } from '@jest/globals';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import request from 'supertest';

// Setup Mock Server. The port is ephemeral (listen(0)): a fixed port
// (8082) collided under full-suite parallel load and flaked the suite
// (22s timeout once, passes alone). Handlers build URLs from `baseUrl`,
// assigned in beforeAll once the OS picks the port.
let baseUrl = '';
const app = express();
app.use(bodyParser.json({ type: ['application/json', 'application/activity+json'] }));
const receivedActivities: any[] = [];
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

app.get('/.well-known/webfinger', (req, res) => {
  res.json({
    subject: req.query.resource,
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `${baseUrl}/actor/mockuser`
      }
    ]
  });
});

app.get('/actor/mockuser', (req, res) => {
  res.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/actor/mockuser`,
    type: 'Person',
    preferredUsername: 'mockuser',
    inbox: `${baseUrl}/actor/mockuser/inbox`,
    publicKey: {
      id: `${baseUrl}/actor/mockuser#main-key`,
      owner: `${baseUrl}/actor/mockuser`,
      publicKeyPem: publicKey
    }
  });
});

app.post('/actor/mockuser/inbox', (req, res) => {
  receivedActivities.push(req.body);
  res.status(202).send('Accepted');
});

// Mock Prisma
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    users: {
      findUnique: mockFindUnique,
      create: jest.fn()
    },
    federation_outbox: {
      create: jest.fn()
    },
    federation_follows: {
      findMany: mockFindMany
    },
    autonomous_actions: {
      create: jest.fn()
    }
  },
}));

let server: any;

jest.unstable_mockModule('../src/lib/ssrf.js', () => ({
  getHardenedFederationAgent: jest.fn().mockImplementation(async (url) => undefined),
  validateFederationUrl: jest.fn().mockImplementation(async (url) => true)
}));

describe('ActivityPub End-to-End Interop', () => {
  beforeAll((done) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('resolves remote actor and dispatches signed activity (broadcast)', async () => {
    // Dynamic import to load service after mocks
    const { FederationService } = await import('../src/services/FederationService.js');
    const federationService = new FederationService();

    const { publicKey: localPub, privateKey: localPriv } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    mockFindUnique.mockResolvedValue({
      id: 1n,
      name: 'localuser',
      private_key: localPriv,
    });

    mockFindMany.mockResolvedValue([
      { actor_uri: `${baseUrl}/actor/mockuser`, status: 'accepted' }
    ]);

    const activity = {
      "type": "Note",
      "content": "Hello world from interop test",
      "fwber:currentEmotion": "happy",
      "fwber:auraScore": 0.8
    };

    // The service handles fetching the remote actor inbox internally inside broadcastUpdate
    // and fires off the HTTP signature to the mock server's inbox.
    await federationService.broadcastUpdate(1n, activity);

    // Delivery is async HTTP: poll briefly instead of asserting instantly
    // (the instant assert raced under full-suite load).
    for (let i = 0; i < 50 && receivedActivities.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }

    // Verify mock server received the payload
    expect(receivedActivities.length).toBe(1);
    expect(receivedActivities[0].type).toBe('Create');
    expect(receivedActivities[0].object.content).toBe('Hello world from interop test');
    expect(receivedActivities[0].object["fwber:currentEmotion"]).toBe('happy');
    expect(receivedActivities[0].object["fwber:auraScore"]).toBe(0.8);
  });
});
