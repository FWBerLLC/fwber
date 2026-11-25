import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAchievementProgress, computeLevel } from '../lib/achievements.js';

const router = Router();

// GET /api/achievements — full catalog with earned state, per-achievement
// progress (current/target), earned XP and the user's level. The catalog
// is code-defined (lib/achievements.ts) and mirrored into the
// achievements table by ensureAchievementCatalog(), so this never
// depends on hand-seeded rows.
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const progress = await getAchievementProgress(userId);
    res.json(progress);
  } catch (error: any) {
    console.error('[Achievements] Error:', error.message);
    // Fallback to static data
    res.json({
      achievements: [
        { slug: 'profile_verified', name: 'Verified Human', description: 'Complete profile verification', icon: '✅', category: 'Profile', token_reward: 50, earned: false, earned_at: null, progress: { current: 0, target: 1, pct: 0 } },
        { slug: 'first_match', name: 'First Connection', description: 'Make your first match', icon: '🤝', category: 'Matches', token_reward: 10, earned: false, earned_at: null, progress: { current: 0, target: 1, pct: 0 } },
        { slug: 'streak_7', name: 'Week on Fire', description: '7-day login streak', icon: '🔥', category: 'Dedication', token_reward: 100, earned: false, earned_at: null, progress: { current: 0, target: 7, pct: 0 } },
      ],
      total: 3,
      earned: 0,
      xp: 0,
      level: computeLevel(0),
    });
  }
});

export default router;
