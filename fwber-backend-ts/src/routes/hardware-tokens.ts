import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma, { serialize } from '../lib/prisma.js';

const router = Router();

router.use(authenticate);

function formatHardwareToken(row: any) {
  if (!row) return null;
  return {
    id: Number(row.id),
    token_uuid: row.token_uuid,
    hardware_model: row.hardware_model || 'fwber_token_v1',
    is_active: Boolean(row.is_active),
    battery_level: row.battery_level !== null && row.battery_level !== undefined ? Number(row.battery_level) : 100,
    last_seen_at: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

// GET /api/hardware-tokens/status — return active paired hardware token for caller
router.get('/status', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const tokens = await prisma.hardware_tokens.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: { id: 'desc' },
    });

    const formatted = tokens.map(formatHardwareToken).filter(Boolean);
    const activeToken = formatted[0] || null;

    res.json(serialize({
      enabled: true,
      token: activeToken,
      tokens: formatted,
      message: activeToken ? 'Hardware token active' : 'No hardware tokens registered',
    }));
  } catch (err: any) {
    console.error('[HardwareTokens] Status error:', err.message);
    res.status(500).json({ message: 'Failed to fetch hardware token status' });
  }
});

// POST /api/hardware-tokens/register — pair a physical BLE/NFC token UUID to caller
router.post('/register', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const rawUuid = typeof req.body?.token_uuid === 'string' ? req.body.token_uuid.trim() : '';
    const hardwareModel = typeof req.body?.hardware_model === 'string' && req.body.hardware_model.trim()
      ? req.body.hardware_model.trim().slice(0, 64)
      : 'fwber_band_v1';

    if (!rawUuid || rawUuid.length < 4 || rawUuid.length > 128) {
      return res.status(400).json({ message: 'A valid hardware pairing code is required' });
    }

    const existingUuid = await prisma.hardware_tokens.findUnique({
      where: { token_uuid: rawUuid },
    });

    if (existingUuid && existingUuid.user_id !== userId && existingUuid.is_active) {
      return res.status(409).json({ message: 'This hardware token is already paired to another account' });
    }

    const now = new Date();
    // Deactivate previous active tokens on this account before activating the newly paired one
    await prisma.hardware_tokens.updateMany({
      where: { user_id: userId, is_active: true },
      data: { is_active: false, updated_at: now },
    });

    const paired = existingUuid
      ? await prisma.hardware_tokens.update({
          where: { id: existingUuid.id },
          data: {
            user_id: userId,
            hardware_model: hardwareModel,
            is_active: true,
            battery_level: existingUuid.battery_level ?? 100,
            last_seen_at: now,
            updated_at: now,
          },
        })
      : await prisma.hardware_tokens.create({
          data: {
            user_id: userId,
            token_uuid: rawUuid,
            hardware_model: hardwareModel,
            is_active: true,
            battery_level: 100,
            last_seen_at: now,
            created_at: now,
            updated_at: now,
          },
        });

    res.status(201).json(serialize({
      token: formatHardwareToken(paired),
      message: 'Hardware token paired successfully',
    }));
  } catch (err: any) {
    console.error('[HardwareTokens] Register error:', err.message);
    res.status(500).json({ message: 'Failed to pair hardware token' });
  }
});

// POST /api/hardware-tokens/ping — record sync heartbeat & trigger vibration test
router.post('/ping', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const active = await prisma.hardware_tokens.findFirst({
      where: { user_id: userId, is_active: true },
      orderBy: { id: 'desc' },
    });

    if (!active) {
      return res.status(404).json({ message: 'No active hardware token paired' });
    }

    const now = new Date();
    const updated = await prisma.hardware_tokens.update({
      where: { id: active.id },
      data: { last_seen_at: now, updated_at: now },
    });

    res.json(serialize({
      success: true,
      token: formatHardwareToken(updated),
      message: 'Hardware token ping acknowledged',
    }));
  } catch (err: any) {
    console.error('[HardwareTokens] Ping error:', err.message);
    res.status(500).json({ message: 'Failed to ping hardware token' });
  }
});

// DELETE /api/hardware-tokens/:id — unpair by numeric id or token_uuid
router.delete('/:id', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const identifier = String(req.params.id || '').trim();
    if (!identifier) {
      return res.status(400).json({ message: 'Token identifier is required' });
    }

    const target = /^\d+$/.test(identifier)
      ? await prisma.hardware_tokens.findFirst({ where: { id: BigInt(identifier), user_id: userId } })
      : await prisma.hardware_tokens.findFirst({ where: { token_uuid: identifier, user_id: userId } });

    if (!target) {
      return res.status(404).json({ message: 'Hardware token not found' });
    }

    await prisma.hardware_tokens.update({
      where: { id: target.id },
      data: { is_active: false, updated_at: new Date() },
    });

    res.json({ message: 'Hardware token unpaired', removed: true, token_uuid: target.token_uuid });
  } catch (err: any) {
    console.error('[HardwareTokens] Delete error:', err.message);
    res.status(500).json({ message: 'Failed to unpair hardware token' });
  }
});

export default router;
