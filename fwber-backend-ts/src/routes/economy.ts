import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

/**
 * Token Economy & Global Bridge Router (`/api/economy`)
 *
 * Powers `components/wallet/SwapInterface.tsx` (the `Bridge` tab inside `/wallet`).
 *
 * Why this router exists:
 * Previously `/api/economy/*` was unmounted in `src/index.ts`, causing requests
 * from `SwapInterface` to hit the `/api` catch-all (`200 []`), which evaluated
 * `res.swaps` to `undefined` and crashed React on `history.length === 0` and
 * `rates.pairs[targetAsset]`.
 *
 * Storage contract:
 * Backed directly by the live MySQL `swap_transactions`, `users.token_balance`,
 * and `wallet_transactions` tables via an atomic Prisma `$transaction`.
 */
const router = Router();

const SUPPORTED_ASSETS = ['SOL', 'USDC', 'PEER_TOKEN'] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

const BRIDGE_FEE_MULTIPLIER = 0.98; // 2% protocol bridge fee (200 bps)

function getCurrentRates() {
  const fwbUsd = Number(process.env.FWB_USD_RATE) > 0 ? Number(process.env.FWB_USD_RATE) : 0.5;
  const solUsd = Number(process.env.SOL_USD_RATE) > 0 ? Number(process.env.SOL_USD_RATE) : 150.0;

  const pairs: Record<SupportedAsset, number> = {
    SOL: Number((fwbUsd / solUsd).toFixed(8)),
    USDC: Number(fwbUsd.toFixed(6)),
    PEER_TOKEN: 1.0,
  };

  return {
    fwb_usd: fwbUsd,
    fee_bps: 200,
    pairs,
    updated_at: new Date().toISOString(),
  };
}

function serializeSwap(row: any) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    source_asset: row.source_asset || 'FWB_TOKEN',
    target_asset: row.target_asset,
    source_amount: Number(row.source_amount ?? 0),
    target_amount: row.target_amount !== null && row.target_amount !== undefined ? Number(row.target_amount) : 0,
    destination_address: row.destination_address || '',
    status: row.status || 'pending',
    tx_hash: row.tx_hash || null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at || new Date().toISOString(),
  };
}

// GET /api/economy/rates — Public exchange rates for FWB bridge preview
router.get('/rates', (_req: Request, res: Response) => {
  res.json(getCurrentRates());
});

// GET /api/economy/swaps — Authenticated user swap history
router.get('/swaps', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const rows = await prisma.swap_transactions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 30,
    });
    const swaps = rows.map(serializeSwap);
    return res.json({ swaps, total: swaps.length });
  } catch (err: any) {
    console.error('[economy] Failed to fetch swaps:', err?.message || err);
    return res.json({ swaps: [], total: 0 });
  }
});

// POST /api/economy/swaps/initiate — Atomic FWB debit + swap settlement queue entry
router.post('/swaps/initiate', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const rawAmount = Number(req.body?.amount);
    const targetAsset = String(req.body?.target_asset || '').toUpperCase() as SupportedAsset;
    const destinationAddress = String(req.body?.destination_address || '').trim();

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({ error: 'Swap amount must be greater than zero' });
    }
    if (!SUPPORTED_ASSETS.includes(targetAsset)) {
      return res.status(400).json({ error: `Unsupported target asset. Choose one of: ${SUPPORTED_ASSETS.join(', ')}` });
    }
    if (destinationAddress.length < 4 || destinationAddress.length > 255) {
      return res.status(400).json({ error: 'A valid destination wallet address or federated Actor URI is required' });
    }

    // `users.token_balance` is an integer column in MySQL; debit whole tokens cleanly.
    const debitTokens = Math.ceil(rawAmount);
    const rates = getCurrentRates();
    const pairRate = rates.pairs[targetAsset] ?? 0;
    const targetAmount = Number((debitTokens * pairRate * BRIDGE_FEE_MULTIPLIER).toFixed(4));

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id: userId },
        select: { token_balance: true },
      });

      const currentBalance = Number(user?.token_balance ?? 0);
      if (!user || currentBalance < debitTokens) {
        return { insufficient: true as const, currentBalance };
      }

      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: { token_balance: { decrement: debitTokens } },
        select: { token_balance: true },
      });

      const now = new Date();
      const swap = await tx.swap_transactions.create({
        data: {
          user_id: userId,
          source_asset: 'FWB_TOKEN',
          target_asset: targetAsset,
          source_amount: debitTokens,
          target_amount: targetAmount,
          destination_address: destinationAddress,
          status: targetAsset === 'PEER_TOKEN' ? 'completed' : 'pending',
          created_at: now,
          updated_at: now,
        },
      });

      await tx.wallet_transactions.create({
        data: {
          user_id: userId,
          amount: -debitTokens,
          type: 'bridge_swap',
          description: `Bridged ${debitTokens} FWB -> ${targetAmount} ${targetAsset}`,
          created_at: now,
          updated_at: now,
        },
      });

      return {
        insufficient: false as const,
        swap,
        newBalance: Number(updatedUser.token_balance ?? 0),
      };
    });

    if (result.insufficient) {
      return res.status(402).json({
        error: `Insufficient FWB balance (${result.currentBalance} available, ${debitTokens} required)`,
      });
    }

    return res.status(201).json({
      success: true,
      swap: serializeSwap(result.swap),
      new_balance: result.newBalance,
    });
  } catch (err: any) {
    console.error('[economy] Failed to initiate swap:', err?.message || err);
    return res.status(500).json({ error: 'Failed to initiate bridge swap' });
  }
});

export default router;
