import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma, { serialize } from '../lib/prisma.js';

const router = Router();

router.post('/generate-link', authenticate, async (req: any, res) => {
  const code = req.user.referral_code || Math.random().toString(36).substring(2, 10);
  res.json({ success: true, url: `https://www.fwber.site/vouch/${code}`, code });
});

router.get('/validate/:code', authenticate, async (req: any, res) => {
  try {
    const { code } = req.params;
    const user = await prisma.users.findFirst({
      where: { referral_code: code }
    });

    if (!user) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      user_id: user.id.toString(),
      name: user.name
    });
  } catch (error) {
    res.json({ valid: false });
  }
});

router.post('/submit', authenticate, async (req: any, res) => {
  try {
    const { to_user_id, type, comment, voucher_name } = req.body;
    const from_user_id = BigInt(req.user.id);

    const vouch = await prisma.vouches.create({
      data: {
        to_user_id: BigInt(to_user_id),
        from_user_id,
        type: type || 'safe',
        comment: comment || '',
        voucher_name: voucher_name || req.user.name,
      }
    });

    res.json({ success: true, vouch_id: vouch.id.toString() });
  } catch (error: any) {
    console.error('[Vouch] Error submitting:', error.message);
    res.status(500).json({ error: 'Failed to submit vouch' });
  }
});

// GET /api/vouch — list vouches for current user (received and given)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const [received, given] = await Promise.all([
      prisma.vouches.findMany({
        where: { to_user_id: userId },
        include: {
          users_vouches_from_user_idTousers: {
            select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 } },
          },
        },
        orderBy: { id: 'desc' },
        take: 50,
      }),
      prisma.vouches.findMany({
        where: { from_user_id: userId },
        include: {
          users_vouches_to_user_idTousers: {
            select: { id: true, name: true, user_profiles: { select: { display_name: true, avatar_url: true }, take: 1 } },
          },
        },
        orderBy: { id: 'desc' },
        take: 50,
      }),
    ]);

    const serializeVouch = (v: any, direction: 'received' | 'given') => {
      const relatedUser = direction === 'received'
        ? v.users_vouches_from_user_idTousers
        : v.users_vouches_to_user_idTousers;
      const profile = relatedUser?.user_profiles?.[0];
      return {
        id: v.id.toString(),
        type: v.type,
        comment: v.comment,
        voucher_name: v.voucher_name || profile?.display_name || relatedUser?.name || 'Anonymous',
        direction,
        user: {
          id: (relatedUser?.id || 0).toString(),
          name: profile?.display_name || relatedUser?.name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
        },
        created_at: v.created_at?.toISOString(),
      };
    };

    res.json(serialize({
      received: received.map((v: any) => serializeVouch(v, 'received')),
      given: given.map((v: any) => serializeVouch(v, 'given')),
      total_received: received.length,
      total_given: given.length,
    }));
  } catch (error: any) {
    console.error('[Vouch] GET error:', error.message);
    res.json({ received: [], given: [], total_received: 0, total_given: 0 });
  }
});

export default router;
