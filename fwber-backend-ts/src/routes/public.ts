import { Router } from 'express';
import * as ai from '../lib/wingman-ai.js';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/public/roast — Return a default roast (no auth, for landing pages)
router.get('/roast', (_req, res) => {
  res.json({
    roast: 'Your profile gives off "I still use Internet Explorer" energy. But hey, at least you showed up! Create a profile for a personalized roast.',
    is_preview: true,
    cta: 'Create a profile at fwber.site for a personalized roast',
  });
});

// POST /api/public/roast — Guest roast/hype (no auth required)
router.post('/roast', async (req, res) => {
  try {
    const { name = 'Anonymous', job = 'mysterious stranger', trait = 'enigmatic', mode = 'roast' } = req.body || {};

    const roast = await ai.generatePublicRoast(
      String(name), String(job), String(trait),
      mode === 'hype' ? 'hype' : 'roast'
    );

    // Use fallback if AI returned empty (providers down)
    const fallbackRoast = mode === 'hype'
      ? `Hey ${name}, you're absolutely killing it as a ${job}! Your "${trait}" vibe is unmatched! Keep shining, you absolute legend! 🔥✨`
      : `Hey ${name}, as a ${job} who's "${trait}", your profile gives off "I read the terms and conditions" energy. But honestly? That's iconic. Own it! 😏`;
    const finalRoast = roast || fallbackRoast;

    const type = mode === 'hype' ? 'hype' : 'roast';
    const shareId = `${type.slice(0, 4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      await prisma.viral_contents.create({
        data: { id: shareId, user_id: 0, type, content: JSON.stringify({ text: finalRoast, user_name: name }) },
      });
    } catch {}

    res.json({ roast: finalRoast, is_preview: !roast, cta: 'Create your own profile at fwber.site', share_id: shareId });
  } catch (err: any) {
    console.error('[public/roast]', err.message);
    const name = (req.body || {}).name || 'you';
    res.json({
      roast: `Hey ${name}, your profile gives off "I still use Internet Explorer" energy. But hey, at least you showed up!`,
      is_preview: true,
      cta: 'Create a profile for a personalized roast',
    });
  }
});

export default router;
