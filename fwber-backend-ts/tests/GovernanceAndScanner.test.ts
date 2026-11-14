import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockPrisma: any = {
  governance_proposals: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  governance_votes: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  governance_appeals: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  users: {
    findUnique: jest.fn(),
  },
  autonomous_actions: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  autonomous_settings: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma,
  serialize: (val: any) => val,
  sanitizeUser: (user: any) => user,
}));

const { isScannerProbePath } = await import('../src/lib/scanner-guard.js');
const { MaintenanceService, isTransientDatabaseConnectivityError } = await import(
  '../src/services/MaintenanceService.js'
);
const { default: governanceRoutes, computeProposalMerkleTree } = await import(
  '../src/routes/governance.js'
);

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function makeAuthHeader(userId = 42) {
  const token = jwt.sign({ id: userId, email: 'member@fwber.online' }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return `Bearer ${token}`;
}

function sha256(msg: string) {
  return crypto.createHash('sha256').update(msg, 'utf8').digest('hex');
}

describe('Scanner Probe Guard (`scanner-guard.ts`)', () => {
  it('flags Kubernetes secret probes, .env dotfiles, SQL dumps, and traversal payloads', () => {
    expect(isScannerProbePath('/api/v1/namespaces/default/secrets')).toBe(true);
    expect(isScannerProbePath('/api/v3/.env')).toBe(true);
    expect(isScannerProbePath('/api/.git/config')).toBe(true);
    expect(isScannerProbePath('/api/backup.sql')).toBe(true);
    expect(isScannerProbePath('/api/wp-admin/setup-config.php')).toBe(true);
    expect(isScannerProbePath('/api/../../etc/passwd')).toBe(true);
  });

  it('allows benign unmounted application paths so experimental UI stubs keep working', () => {
    expect(isScannerProbePath('/api/experimental-widget')).toBe(false);
    expect(isScannerProbePath('/api/matches/suggestions')).toBe(false);
    expect(isScannerProbePath('/api/governance/proposals')).toBe(false);
  });
});

describe('MaintenanceService Transient DB Outage Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => ({
      id: where?.id ?? 42n,
      email: 'member@fwber.online',
      role: 'user',
      is_moderator: false,
      token_balance: 250,
      user_profiles: null,
    }));
  });

  it('skips secondary AutonomousService.logAction DB write when MySQL is unreachable (P1001/P2024)', async () => {
    const dbErr: any = new Error("Can't reach database server at `127.0.0.1:3306`");
    dbErr.code = 'P1001';
    expect(isTransientDatabaseConnectivityError(dbErr)).toBe(true);

    mockPrisma.autonomous_actions.findMany.mockRejectedValue(dbErr);

    await MaintenanceService.performMaintenance();

    expect(mockPrisma.autonomous_actions.create).not.toHaveBeenCalled();
  });

  it('still records Failed action in AutonomousService.logAction for non-connectivity errors', async () => {
    const appErr = new Error('Unexpected NaN in sentiment threshold');
    expect(isTransientDatabaseConnectivityError(appErr)).toBe(false);

    mockPrisma.autonomous_actions.findMany.mockRejectedValue(appErr);
    mockPrisma.autonomous_actions.create.mockResolvedValue({ id: 1n });

    await MaintenanceService.performMaintenance();

    expect(mockPrisma.autonomous_actions.create).toHaveBeenCalledTimes(1);
  });
});

describe('Community Council Governance Router (`/api/governance`)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/governance', governanceRoutes);
  app.use('/api', (req, res) => {
    if (isScannerProbePath(req.originalUrl || req.url)) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json([]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.users.findUnique.mockImplementation(async ({ where }: any) => ({
      id: where?.id ?? 42n,
      email: 'member@fwber.online',
      role: 'user',
      is_moderator: false,
      token_balance: 250,
      user_profiles: null,
    }));
  });

  it('returns 404 for scanner probes on unmatched /api routes', async () => {
    const res1 = await request(app).get('/api/v1/namespaces/default/secrets');
    expect(res1.status).toBe(404);

    const res2 = await request(app).get('/api/v3/.env');
    expect(res2.status).toBe(404);
  });

  it('lists proposals with aggregated weights and verifiable SHA-256 Merkle proofs', async () => {
    const sampleVotes = [
      { id: 10n, user_id: 42n, option_index: 0, token_weight: 250 },
      { id: 11n, user_id: 77n, option_index: 1, token_weight: 100 },
      { id: 12n, user_id: 99n, option_index: 0, token_weight: 50 },
    ];
    const sampleProposal = {
      id: 5n,
      creator_id: 42n,
      title: 'Expand Proximity Chatroom Radius',
      description: 'Increase default metro chatroom radius to 5km for denser events.',
      category: 'policy',
      options: ['Yes', 'No', 'Abstain'],
      min_tokens_required: 0,
      starts_at: new Date(Date.now() - 86400_000),
      expires_at: new Date(Date.now() + 5 * 86400_000),
      status: 'active',
      governance_votes: sampleVotes,
    };

    mockPrisma.governance_proposals.findMany.mockResolvedValue([sampleProposal]);
    mockPrisma.governance_proposals.findUnique.mockResolvedValue(sampleProposal);

    const listRes = await request(app).get('/api/governance/proposals');
    expect(listRes.status).toBe(200);
    expect(listRes.body.proposals).toHaveLength(1);
    expect(listRes.body.proposals[0].votes_count).toBe(3);
    expect(parseFloat(listRes.body.proposals[0].results[0].total_weight)).toBe(300);
    expect(parseFloat(listRes.body.proposals[0].results[1].total_weight)).toBe(100);

    // Verify Merkle proof endpoint matches VoteVerifier.tsx client-side SHA-256 algorithm
    const proofRes = await request(app)
      .get('/api/governance/proposals/5/proof')
      .set('Authorization', makeAuthHeader(77));

    expect(proofRes.status).toBe(200);
    expect(proofRes.body.option_voted).toBe('No');

    let currentHash = proofRes.body.leaf_hash;
    for (const step of proofRes.body.proof) {
      if (step.left) {
        currentHash = sha256(step.left + currentHash);
      } else if (step.right) {
        currentHash = sha256(currentHash + step.right);
      }
    }
    expect(currentHash).toBe(proofRes.body.merkle_root);
    expect(currentHash).toBe(listRes.body.proposals[0].merkle_root);
  });

  it('creates a moderation appeal and linked 7-day Council proposal', async () => {
    mockPrisma.governance_appeals.findFirst.mockResolvedValue(null);
    mockPrisma.governance_proposals.create.mockResolvedValue({
      id: 21n,
      creator_id: 42n,
      title: 'Moderation Appeal Review — Member #42',
      description: 'A'.repeat(80),
      category: 'mod',
      options: ['Uphold Appeal (Restore Standing)', 'Deny Appeal (Maintain Restriction)', 'Abstain'],
      min_tokens_required: 0,
      starts_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 86400_000),
      status: 'active',
      governance_votes: [],
    });
    mockPrisma.governance_appeals.create.mockResolvedValue({
      id: 9n,
      user_id: 42n,
      reason: 'A'.repeat(80),
      status: 'pending',
      proposal_id: 21n,
    });

    const res = await request(app)
      .post('/api/governance/appeals')
      .set('Authorization', makeAuthHeader(42))
      .send({ reason: 'A'.repeat(80) });

    expect(res.status).toBe(201);
    expect(res.body.appeal.proposal_id).toBe(21);
    expect(res.body.proposal.category).toBe('mod');
  });
});
