import { jest } from '@jest/globals';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import request from 'supertest';

const baseUrl = 'http://federation-mock.local';
const app = express();
app.use(bodyParser.json({ type: ['application/json', 'application/activity+json'] }));

const receivedActivities: any[] = [];
const receivedHeaders: Record<string, any>[] = [];

const { publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

app.get('/.well-known/webfinger', (req, res) => {
  res.json({
    subject: req.query.resource,
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `${baseUrl}/actor/mockuser`,
      },
    ],
  });
});

app.get('/actor/mockuser', (_req, res) => {
  res.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/actor/mockuser`,
    type: 'Person',
    preferredUsername: 'mockuser',
    inbox: `${baseUrl}/actor/mockuser/inbox`,
    publicKey: {
      id: `${baseUrl}/actor/mockuser#main-key`,
      owner: `${baseUrl}/actor/mockuser`,
      publicKeyPem: publicKey,
    },
  });
});

app.post('/actor/mockuser/inbox', (req, res) => {
  receivedHeaders.push(req.headers);
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
      create: jest.fn(),
    },
    federation_outbox: {
      create: jest.fn(),
    },
    federation_follows: {
      findMany: mockFindMany,
    },
    autonomous_actions: {
      create: jest.fn(),
    },
  },
}));

jest.unstable_mockModule('../src/lib/ssrf.js', () => ({
  getHardenedFederationAgent: jest.fn().mockImplementation(async () => undefined),
  validateFederationUrl: jest.fn().mockImplementation(async () => true),
}));

// Bridge Axios HTTP calls directly into the Express `app` via Supertest so proxy env vars
// or sandboxed outbound TCP restrictions never flake end-to-end ActivityPub interop checks.
jest.unstable_mockModule('axios', () => ({
  default: {
    get: async (urlStr: string, config?: any) => {
      const u = new URL(urlStr);
      let req = request(app).get(u.pathname + u.search);
      for (const [k, v] of Object.entries(config?.headers || {})) {
        if (v !== undefined) req = req.set(k, String(v));
      }
      const res = await req;
      return { status: res.status, data: res.body, headers: res.headers };
    },
    post: async (urlStr: string, body: any, config?: any) => {
      const u = new URL(urlStr);
      let req = request(app).post(u.pathname + u.search);
      for (const [k, v] of Object.entries(config?.headers || {})) {
        if (k.toLowerCase() !== 'host' && v !== undefined) {
          req = req.set(k, String(v));
        }
      }
      const res = await req.send(JSON.stringify(body));
      return { status: res.status, data: res.body, headers: res.headers };
    },
  },
}));

describe('ActivityPub End-to-End Interop', () => {
  it('resolves remote actor and dispatches signed activity (broadcast)', async () => {
    const { FederationService } = await import('../src/services/FederationService.js');
    const federationService = new FederationService();

    const { privateKey: localPriv } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    mockFindUnique.mockResolvedValue({
      id: 1n,
      name: 'localuser',
      private_key: localPriv,
    });

    mockFindMany.mockResolvedValue([
      { actor_uri: `${baseUrl}/actor/mockuser`, status: 'accepted' },
    ]);

    const activity = {
      type: 'Note',
      content: 'Hello world from interop test',
      'fwber:currentEmotion': 'happy',
      'fwber:auraScore': 0.8,
    };

    await federationService.broadcastUpdate(1n, activity);

    expect(receivedActivities.length).toBe(1);
    expect(receivedActivities[0].type).toBe('Create');
    expect(receivedActivities[0].object.content).toBe('Hello world from interop test');
    expect(receivedActivities[0].object['fwber:currentEmotion']).toBe('happy');
    expect(receivedActivities[0].object['fwber:auraScore']).toBe(0.8);
    expect(receivedHeaders[0].signature).toContain('algorithm="rsa-sha256"');
    expect(receivedHeaders[0].digest).toMatch(/^SHA-256=/);
  });
});
