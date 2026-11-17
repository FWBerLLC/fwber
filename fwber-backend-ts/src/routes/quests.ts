import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { serialize } from '../lib/prisma.js';
import { TokenDistributionService } from '../services/TokenDistributionService.js';
import crypto from 'crypto';
import { VibePromotionService } from '../services/VibePromotionService.js';

const router = Router();
const tokenService = new TokenDistributionService();

// GET /api/quests/active — Get active neighborhood quests for the user
router.get('/active', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const profile = await prisma.user_profiles.findFirst({
        where: { user_id: userId }
    });
    const currentEmotion = (profile?.current_emotion || 'neutral').toLowerCase();

    // Optionally generate a contextual quest based on recent vibe if requested (e.g. via an admin trigger or autonomous system)
    // Here we'll expose a query param `?generate=true` to act as an admin trigger for the demo
    if (req.query.generate === 'true') {
      const loc = await prisma.user_locations.findFirst({
        where: { user_id: userId, is_active: true },
        orderBy: { last_updated: 'desc' }
      });
      if (loc) {
        await VibePromotionService.generateContextualQuest(Number(loc.latitude), Number(loc.longitude));
      }
    }

    const allQuests = await prisma.quests.findMany({
      where: {
        is_active: true,
        expires_at: { gt: new Date() }
      },
      include: {
        user_quests: {
          where: { user_id: userId }
        }
      }
    });

    const filteredQuests = allQuests.map((q: any) => ({
      ...q,
      ai_vibe_match: currentEmotion === 'excited' || currentEmotion === 'happy' ? true : false
    }));

    res.json(serialize(filteredQuests));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

// POST /api/quests/:id/accept — Join a quest
router.post('/:id/accept', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let questId: bigint;
    try {
      questId = BigInt(req.params.id);
    } catch {
      return res.status(400).json({ error: 'Invalid quest id' });
    }

    // Nonexistent quest ids used to 500 on the user_quests FK constraint.
    const quest = await prisma.quests.findUnique({ where: { id: questId } });
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    const userQuest = await prisma.user_quests.upsert({
      where: { user_id_quest_id: { user_id: userId, quest_id: questId } },
      update: {},
      create: {
        user_id: userId,
        quest_id: questId,
        status: 'active',
        progress: { current: 0, target: 3 }
      }
    });

    res.json({ success: true, userQuest: serialize(userQuest) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to accept quest' });
  }
});

// POST /api/quests/:id/complete — Mark quest as completed
router.post('/:id/complete', authenticate, async (req: any, res) => {
    try {
      const userId = BigInt(req.user.id);
      const questId = BigInt(req.params.id);

      const uq = await prisma.user_quests.findUnique({
        where: { user_id_quest_id: { user_id: userId, quest_id: questId } },
        include: { quests: true }
      });

      if (!uq || uq.status !== 'active') return res.status(400).json({ error: 'Quest not active' });

      // Verification Logic (e.g. ZK/NFC crypto proofs)
      const { proof } = req.body;
      // For now, if a proof is passed, we check it against a simulated secret.
      if (proof) {
         const hash = crypto.createHash('sha256').update(`quest_${questId}_secret`).digest('hex');
         if (proof !== hash) {
             return res.status(403).json({ error: 'Invalid quest completion proof.' });
         }
      }

      // Grant rewards
      await tokenService.awardTokens(
        userId,
        Number(uq.quests.token_reward),
        'quest_reward',
        `Completed Quest: ${uq.quests.title}`
      );

      const updated = await prisma.user_quests.update({
        where: { id: uq.id },
        data: {
          status: 'claimed',
          completed_at: new Date()
        }
      });

      res.json({ success: true, reward: Number(uq.quests.token_reward) });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to complete quest' });
    }
  });

export default router;
