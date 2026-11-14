import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

/**
 * Community Council Governance & Dispute Appeals Router (`/api/governance`) — `v2.3.89`
 *
 * WHY THIS ROUTER EXISTS:
 * Production MySQL (`schema.prisma`) already contained `governance_proposals`,
 * `governance_votes`, and `governance_appeals`, and the Next.js frontend
 * (`/council`, `CreateProposalModal`, `VoteVerifier`, `/council/appeals`) issued
 * requests to `/api/governance/*` — yet the Express TypeScript backend lacked
 * a mounted `/api/governance` router. As a result, `GET /api/governance/proposals`
 * fell through to the `200 []` catch-all (crashing `/council` when reading
 * `res.proposals.filter(...)`) and all votes, proposals, and ban appeals were
 * silently discarded.
 *
 * CRYPTOGRAPHIC DESIGN (`computeProposalMerkleTree`):
 * `fwber-frontend/components/council/VoteVerifier.tsx` performs client-side
 * WebCrypto `SHA-256` verification over `leaf_hash` and `proof`:
 *   - If `step.left` is set:  `currentHash = sha256(step.left + currentHash)`
 *   - If `step.right` is set: `currentHash = sha256(currentHash + step.right)`
 *   - Verifies `currentHash === merkle_root`.
 *
 * To guarantee 100% deterministic, client-verifiable proofs without extra DB
 * columns, leaves are ordered canonically by `vote.id ASC` and hashed over the
 * domain-separated canonical string:
 *   `fwber:vote:v1:${proposalId}:${vote.id}:${vote.user_id}:${vote.option_index}:${weightFixed}`
 * Odd-length tree layers duplicate the trailing hash (`right: currentLayer[i]`)
 * so every voter receives a complete binary inclusion path up to `merkle_root`.
 */

const router = Router();

const ALLOWED_CATEGORIES = new Set(['policy', 'mod', 'tech', 'treasury']);
const DEFAULT_MIN_PROPOSAL_TOKENS = Number(process.env.GOVERNANCE_MIN_PROPOSAL_TOKENS ?? 100);

export interface VoteRecordLike {
  id: bigint | number;
  user_id: bigint | number;
  option_index: number;
  token_weight: any;
}

export interface MerkleProofStep {
  left?: string;
  right?: string;
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute deterministic SHA-256 Merkle root and per-vote inclusion proofs
 * compatible with `VoteVerifier.tsx`'s WebCrypto verifier.
 */
export function computeProposalMerkleTree(
  proposalId: bigint | number,
  votes: VoteRecordLike[]
): {
  merkleRoot: string;
  leafHashes: Map<string, string>;
  proofsByUserId: Map<string, MerkleProofStep[]>;
} {
  const sortedVotes = [...votes].sort((a, b) => Number(a.id) - Number(b.id));

  if (sortedVotes.length === 0) {
    return {
      merkleRoot: sha256Hex(`fwber:proposal:empty:${proposalId.toString()}`),
      leafHashes: new Map(),
      proofsByUserId: new Map(),
    };
  }

  const leafHashes = new Map<string, string>();
  const proofsByUserId = new Map<string, MerkleProofStep[]>();

  let currentLayer = sortedVotes.map((v) => {
    const userKey = v.user_id.toString();
    const weightFixed = Number(v.token_weight ?? 0).toFixed(4);
    const leaf = sha256Hex(
      `fwber:vote:v1:${proposalId.toString()}:${v.id.toString()}:${userKey}:${v.option_index}:${weightFixed}`
    );
    leafHashes.set(userKey, leaf);
    proofsByUserId.set(userKey, []);
    return leaf;
  });

  // Track which user keys sit under each node index in `currentLayer` so we can
  // append `{ left }` or `{ right }` sibling hashes in one bottom-up pass.
  let layerOwners: string[][] = sortedVotes.map((v) => [v.user_id.toString()]);

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    const nextOwners: string[][] = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      const leftHash = currentLayer[i] ?? '';
      const rightHash = (i + 1 < currentLayer.length ? currentLayer[i + 1] : currentLayer[i]) ?? leftHash;
      const leftUsers = layerOwners[i] ?? [];
      const rightUsers = i + 1 < layerOwners.length ? (layerOwners[i + 1] ?? []) : [];

      for (const u of leftUsers) {
        proofsByUserId.get(u)?.push({ right: rightHash });
      }
      for (const u of rightUsers) {
        proofsByUserId.get(u)?.push({ left: leftHash });
      }

      nextLayer.push(sha256Hex(leftHash + rightHash));
      nextOwners.push([...leftUsers, ...rightUsers]);
    }

    currentLayer = nextLayer;
    layerOwners = nextOwners;
  }

  return {
    merkleRoot: currentLayer[0] ?? '',
    leafHashes,
    proofsByUserId,
  };
}

function normalizeOptions(rawOptions: unknown): string[] {
  if (Array.isArray(rawOptions)) {
    const cleaned = rawOptions
      .map((o) => (typeof o === 'string' ? o.trim() : String(o ?? '').trim()))
      .filter(Boolean);
    if (cleaned.length >= 2) return cleaned.slice(0, 8);
  }
  if (typeof rawOptions === 'string') {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) return normalizeOptions(parsed);
    } catch {
      // fall through to default options
    }
  }
  return ['Yes', 'No', 'Abstain'];
}

function serializeProposal(proposal: any, viewerUserId?: bigint) {
  const options = normalizeOptions(proposal.options);
  const votes: any[] = Array.isArray(proposal.governance_votes) ? proposal.governance_votes : [];

  const weightByOption = new Map<number, number>();
  for (let idx = 0; idx < options.length; idx++) {
    weightByOption.set(idx, 0);
  }
  for (const vote of votes) {
    const prev = weightByOption.get(vote.option_index) ?? 0;
    weightByOption.set(vote.option_index, prev + Number(vote.token_weight ?? 0));
  }

  const results = options.map((_, option_index) => ({
    option_index,
    total_weight: (weightByOption.get(option_index) ?? 0).toFixed(4),
  }));

  const { merkleRoot } = computeProposalMerkleTree(proposal.id, votes);
  const viewerVote =
    viewerUserId !== undefined
      ? votes.find((v) => BigInt(v.user_id) === viewerUserId)
      : undefined;

  return {
    id: Number(proposal.id),
    creator_id: Number(proposal.creator_id),
    title: proposal.title,
    description: proposal.description,
    category: ALLOWED_CATEGORIES.has(proposal.category) ? proposal.category : 'policy',
    options,
    min_tokens_required: Number(proposal.min_tokens_required ?? 10),
    starts_at: proposal.starts_at ? new Date(proposal.starts_at).toISOString() : new Date().toISOString(),
    expires_at: proposal.expires_at
      ? new Date(proposal.expires_at).toISOString()
      : new Date(Date.now() + 7 * 86400_000).toISOString(),
    votes_count: votes.length,
    status: proposal.status || 'active',
    merkle_root: merkleRoot,
    // Optional Solana anchor hash when configured via env or finalized ledger anchor;
    // empty string when off-chain only so the UI never links to a broken explorer tx.
    on_chain_tx: process.env.SOLANA_GOVERNANCE_ANCHOR_TX || '',
    results,
    user_vote: viewerVote
      ? {
          option_index: viewerVote.option_index,
          token_weight: Number(viewerVote.token_weight ?? 0),
        }
      : null,
  };
}

/**
 * Automatically finalize any `active` proposals whose `expires_at` timestamp has passed.
 * Option 0 ("Yes" / primary affirmative option) strictly exceeding Option 1 ("No")
 * marks the proposal `passed`; ties or "No" majorities mark it `rejected`.
 */
async function settleExpiredProposals(proposals: any[]): Promise<void> {
  const now = Date.now();
  for (const p of proposals) {
    if (p.status === 'active' && p.expires_at && new Date(p.expires_at).getTime() <= now) {
      const votes: any[] = Array.isArray(p.governance_votes) ? p.governance_votes : [];
      let opt0 = 0;
      let opt1 = 0;
      for (const v of votes) {
        if (v.option_index === 0) opt0 += Number(v.token_weight ?? 0);
        else if (v.option_index === 1) opt1 += Number(v.token_weight ?? 0);
      }
      const nextStatus = votes.length > 0 && opt0 > opt1 ? 'passed' : 'rejected';
      try {
        await prisma.governance_proposals.update({
          where: { id: p.id },
          data: { status: nextStatus, updated_at: new Date() },
        });
        p.status = nextStatus;
      } catch {
        // Non-fatal during read path
      }
    }
  }
}

function tryExtractViewerId(req: AuthRequest): bigint | undefined {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id?: number | string };
    if (decoded?.id !== undefined) return BigInt(decoded.id);
  } catch {
    // Optional viewer extraction: invalid/expired token simply omits `user_vote`
  }
  return undefined;
}

/**
 * GET /api/governance/proposals
 * Lists active and finalized Council proposals with real vote tallies and Merkle roots.
 */
router.get('/proposals', async (req: AuthRequest, res: Response) => {
  try {
    const proposals = await prisma.governance_proposals.findMany({
      include: {
        governance_votes: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    await settleExpiredProposals(proposals);

    const viewerId = tryExtractViewerId(req);
    res.json({
      proposals: proposals.map((p) => serializeProposal(p, viewerId)),
    });
  } catch (err: any) {
    console.error('[Governance] Failed to list proposals:', err?.message || err);
    res.status(500).json({ error: 'Failed to load governance proposals', proposals: [] });
  }
});

/**
 * POST /api/governance/proposals
 * Creates a new community proposal. Enforces `DEFAULT_MIN_PROPOSAL_TOKENS` (100 FWB)
 * for standard accounts while allowing moderators/admins to publish operational proposals.
 */
router.post('/proposals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const title = String(req.body?.title ?? '').trim();
    const description = String(req.body?.description ?? '').trim();
    const rawCategory = String(req.body?.category ?? 'policy').trim().toLowerCase();
    const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'policy';
    const options = normalizeOptions(req.body?.options);
    const durationDays = Math.min(30, Math.max(1, Number.parseInt(String(req.body?.duration_days ?? '7'), 10) || 7));

    if (title.length < 5 || title.length > 255) {
      return res.status(400).json({ error: 'Proposal title must be between 5 and 255 characters.' });
    }
    if (description.length < 15 || description.length > 5000) {
      return res.status(400).json({ error: 'Proposal description must be between 15 and 5,000 characters.' });
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, token_balance: true, is_moderator: true, role: true },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const balance = Number(dbUser.token_balance ?? 0);
    const isPrivileged = Boolean(dbUser.is_moderator) || dbUser.role === 'admin' || dbUser.role === 'moderator';

    if (!isPrivileged && balance < DEFAULT_MIN_PROPOSAL_TOKENS) {
      return res.status(403).json({
        error: `Creating a Council proposal requires at least ${DEFAULT_MIN_PROPOSAL_TOKENS} FWB tokens (current balance: ${balance.toFixed(0)} FWB).`,
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 86400_000);

    const created = await prisma.governance_proposals.create({
      data: {
        creator_id: userId,
        title,
        description,
        category,
        options,
        min_tokens_required: 0,
        starts_at: now,
        expires_at: expiresAt,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      include: { governance_votes: true },
    });

    return res.status(201).json({
      proposal: serializeProposal(created, userId),
    });
  } catch (err: any) {
    console.error('[Governance] Failed to create proposal:', err?.message || err);
    return res.status(500).json({ error: 'Failed to create proposal.' });
  }
});

/**
 * POST /api/governance/proposals/:id/vote
 * Records or updates a user's vote on an active proposal.
 * Uses the user's live `token_balance` (with a floor of `1.0` governance weight for
 * verified accounts when `min_tokens_required == 0`, so new community members can
 * participate immediately unless a proposal specifies `min_tokens_required > 0`).
 */
router.post('/proposals/:id/vote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const proposalIdNum = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(proposalIdNum) || proposalIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid proposal ID.' });
    }
    const proposalId = BigInt(proposalIdNum);
    const userId = BigInt(req.user!.id);
    const optionIndex = Number.parseInt(String(req.body?.option_index), 10);

    const proposal = await prisma.governance_proposals.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found.' });
    }
    if (proposal.status !== 'active' || (proposal.expires_at && new Date(proposal.expires_at).getTime() <= Date.now())) {
      return res.status(400).json({ error: 'Voting has closed on this proposal.' });
    }

    const options = normalizeOptions(proposal.options);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'Selected vote option is out of range.' });
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { token_balance: true, is_moderator: true, role: true },
    });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const balance = Number(dbUser.token_balance ?? 0);
    const minRequired = Number(proposal.min_tokens_required ?? 0);
    const isPrivileged = Boolean(dbUser.is_moderator) || dbUser.role === 'admin';

    if (!isPrivileged && minRequired > 0 && balance < minRequired) {
      return res.status(403).json({
        error: `At least ${minRequired} FWB tokens are required to vote on this proposal.`,
      });
    }

    const effectiveWeight = Math.max(1, balance);
    const now = new Date();

    const existingVote = await prisma.governance_votes.findFirst({
      where: {
        user_id: userId,
        governance_proposal_id: proposalId,
      },
    });

    const vote = existingVote
      ? await prisma.governance_votes.update({
          where: { id: existingVote.id },
          data: {
            option_index: optionIndex,
            token_weight: effectiveWeight,
            updated_at: now,
          },
        })
      : await prisma.governance_votes.create({
          data: {
            user_id: userId,
            governance_proposal_id: proposalId,
            option_index: optionIndex,
            token_weight: effectiveWeight,
            created_at: now,
            updated_at: now,
          },
        });

    return res.json({
      success: true,
      vote: {
        id: Number(vote.id),
        proposal_id: proposalIdNum,
        option_index: vote.option_index,
        option_voted: options[vote.option_index],
        token_weight: Number(vote.token_weight),
      },
    });
  } catch (err: any) {
    console.error('[Governance] Failed to cast vote:', err?.message || err);
    return res.status(500).json({ error: 'Failed to record vote.' });
  }
});

/**
 * GET /api/governance/proposals/:id/proof
 * Generates a cryptographic SHA-256 Merkle inclusion proof for the caller's vote.
 */
router.get('/proposals/:id/proof', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const proposalIdNum = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(proposalIdNum) || proposalIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid proposal ID.' });
    }
    const proposalId = BigInt(proposalIdNum);
    const userId = BigInt(req.user!.id);

    const proposal = await prisma.governance_proposals.findUnique({
      where: { id: proposalId },
      include: {
        governance_votes: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found.' });
    }

    const votes = proposal.governance_votes || [];
    const userKey = userId.toString();
    const myVote = votes.find((v) => v.user_id.toString() === userKey);

    if (!myVote) {
      return res.status(404).json({ error: "You didn't vote on this proposal." });
    }

    const options = normalizeOptions(proposal.options);
    const { merkleRoot, leafHashes, proofsByUserId } = computeProposalMerkleTree(proposal.id, votes);

    return res.json({
      proposal_id: proposalIdNum,
      option_index: myVote.option_index,
      option_voted: options[myVote.option_index] ?? `Option #${myVote.option_index + 1}`,
      weight: Number(myVote.token_weight ?? 0),
      leaf_hash: leafHashes.get(userKey) || '',
      proof: proofsByUserId.get(userKey) || [],
      merkle_root: merkleRoot,
      on_chain_tx: process.env.SOLANA_GOVERNANCE_ANCHOR_TX || '',
    });
  } catch (err: any) {
    console.error('[Governance] Failed to compute vote proof:', err?.message || err);
    return res.status(500).json({ error: 'Failed to compute vote proof.' });
  }
});

/**
 * GET /api/governance/appeals
 * Returns the authenticated user's moderation/dispute appeals and linked proposal status.
 */
router.get('/appeals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const appeals = await prisma.governance_appeals.findMany({
      where: { user_id: userId },
      include: {
        governance_proposals: {
          include: { governance_votes: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 25,
    });

    return res.json({
      appeals: appeals.map((a) => ({
        id: Number(a.id),
        reason: a.reason,
        status: a.status,
        proposal_id: a.proposal_id ? Number(a.proposal_id) : null,
        created_at: a.created_at ? new Date(a.created_at).toISOString() : null,
        proposal: a.governance_proposals ? serializeProposal(a.governance_proposals, userId) : null,
      })),
    });
  } catch (err: any) {
    console.error('[Governance] Failed to fetch appeals:', err?.message || err);
    return res.status(500).json({ error: 'Failed to load appeals.', appeals: [] });
  }
});

/**
 * POST /api/governance/appeals
 * Submits a peer-reviewed moderation/unban appeal and automatically opens a 7-day
 * `mod` Council proposal so community jurors can vote on restoring standing.
 */
router.post('/appeals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const reason = String(req.body?.reason ?? '').trim();

    if (reason.length < 50 || reason.length > 2000) {
      return res.status(400).json({
        error: 'Appeal rationale must be between 50 and 2,000 characters.',
      });
    }

    const existingPending = await prisma.governance_appeals.findFirst({
      where: { user_id: userId, status: 'pending' },
    });
    if (existingPending) {
      return res.status(409).json({
        error: 'You already have a pending Council appeal under community review.',
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 86400_000);

    const proposal = await prisma.governance_proposals.create({
      data: {
        creator_id: userId,
        title: `Moderation Appeal Review — Member #${userId.toString()}`,
        description: reason,
        category: 'mod',
        options: ['Uphold Appeal (Restore Standing)', 'Deny Appeal (Maintain Restriction)', 'Abstain'],
        min_tokens_required: 0,
        starts_at: now,
        expires_at: expiresAt,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      include: { governance_votes: true },
    });

    const appeal = await prisma.governance_appeals.create({
      data: {
        user_id: userId,
        reason,
        status: 'pending',
        proposal_id: proposal.id,
        created_at: now,
        updated_at: now,
      },
    });

    return res.status(201).json({
      appeal: {
        id: Number(appeal.id),
        reason: appeal.reason,
        status: appeal.status,
        proposal_id: Number(proposal.id),
        created_at: now.toISOString(),
      },
      proposal: serializeProposal(proposal, userId),
    });
  } catch (err: any) {
    console.error('[Governance] Failed to submit appeal:', err?.message || err);
    return res.status(500).json({ error: 'Failed to submit appeal.' });
  }
});

export default router;
