import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { createRateLimiter } from '../lib/rateLimit.js';

const router = Router();
const authController = new AuthController();

// Brute-force / enumeration throttling (v2.3.40). Windows are per-client-IP.
// These are deliberately generous enough for shared NATs (many users behind
// one office/CGNAT IP) while stopping credential stuffing and reset-spam.
const registerLimiter = createRateLimiter({ name: 'auth-register', windowMs: 60_000, max: 5 });
const loginLimiter = createRateLimiter({ name: 'auth-login', windowMs: 60_000, max: 10 });
const forgotLimiter = createRateLimiter({ name: 'auth-forgot', windowMs: 60_000, max: 5 });
const resetLimiter = createRateLimiter({ name: 'auth-reset', windowMs: 60_000, max: 10 });
const referralLimiter = createRateLimiter({ name: 'auth-referral', windowMs: 60_000, max: 30 });

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', forgotLimiter, authController.forgotPassword);
router.post('/reset-password', resetLimiter, authController.resetPassword);

router.get('/referral/:code', referralLimiter, async (req, res) => {
  try {
    const { code } = req.params;
    const user = await prisma.users.findFirst({
      where: { referral_code: code },
      include: { user_profiles: true }
    });
    if (!user) {
      return res.status(404).json({ valid: false, message: 'Invalid referral code' });
    }
    const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
    res.json({
      valid: true,
      referrer_name: profile?.display_name || user.name || 'A user',
      referrer_avatar: profile?.avatar_url || null,
      referrer_id: Number(user.id)
    });
  } catch (error: any) {
    console.error('[Auth] Referral lookup error:', error.message);
    res.status(500).json({ valid: false });
  }
});

export default router;
