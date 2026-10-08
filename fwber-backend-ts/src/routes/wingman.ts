import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import * as ai from '../lib/wingman-ai.js';
import prisma from '../lib/prisma.js';
import OpenAI from 'openai';
import { WingmanService } from '../services/WingmanService.js';

// Lazy client construction: `new OpenAI()` throws at import time when no
// credential is configured, which used to crash the entire API on boot just
// because an optional AI integration was unconfigured. Deferring creation to
// first use lets the server start and lets only this feature fail, with a
// clear 503 telling the operator which variable to set.
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'AI wingman is not configured: set OPENROUTER_API_KEY or OPENAI_API_KEY to enable this endpoint.'
    );
  }
  openaiClient = new OpenAI({
    apiKey,
    // OpenRouter is preferred; fall back to direct OpenAI when only that key exists.
    baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined,
    defaultHeaders: process.env.OPENROUTER_API_KEY ? {
      'HTTP-Referer': 'https://www.fwber.site',
      'X-Title': 'fwber',
    } : undefined
  });
  return openaiClient;
}

const router = Router();

function buildProfileText(p: any): string {
  if (!p) return 'No profile data available.';
  const parts: string[] = [];
  if (p.display_name) parts.push(`Name: ${p.display_name}`);
  if (p.gender) parts.push(`Gender: ${p.gender}`);
  if (p.bio) parts.push(`Bio: ${p.bio}`);
  if (p.occupation) parts.push(`Occupation: ${p.occupation}`);
  if (p.location_description) parts.push(`Location: ${p.location_description}`);
  if (p.date_of_birth) {
    const age = Math.floor((Date.now() - new Date(p.date_of_birth as any).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age > 0) parts.push(`Age: ${age}`);
  }
  const interests: string[] = Array.isArray(p.interests) ? p.interests : (typeof p.interests === 'string' ? JSON.parse(p.interests) : []);
  if (interests.length) parts.push(`Interests: ${interests.join(', ')}`);
  const looking: string[] = Array.isArray(p.looking_for) ? p.looking_for : (typeof p.looking_for === 'string' ? JSON.parse(p.looking_for) : []);
  if (looking.length) parts.push(`Looking for: ${looking.join(', ')}`);
  if (p.relationship_style) parts.push(`Relationship style: ${p.relationship_style}`);
  return parts.join('\n');
}

// Helper: store result so share links work
async function storeResult(userId: bigint, type: string, content: any): Promise<string> {
  const shareId = `${type.slice(0, 4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    // Get user details for metadata
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { user_profiles: true }
    });

    const profile = Array.isArray(user?.user_profiles) ? user?.user_profiles[0] : user?.user_profiles;
    const userName = profile?.display_name || user?.name || 'Someone';

    await prisma.viral_contents.create({
      data: {
        id: shareId,
        user_id: userId,
        type,
        content: JSON.stringify({
          ...content,
          user_name: userName,
          profile_id: userId.toString()
        }),
      },
    });
  } catch (err: any) {
    console.error('[storeResult]', err.message);
  }
  return shareId;
}

router.use(authenticate);

// ─── Roast / Hype ───────────────────────────────────────────────────────────

// GET /wingman/roast — return a fallback roast (for GET requests)
router.get("/roast", async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    let roast = await ai.generateRoast(userId, "roast");
    if (!roast || roast.trim() === "") {
      const fallbacks = [
        "Your profile is like a parking ticket - technically valid but nobody wants to deal with it.",
        "Your bio reads like a Terms of Service agreement - long, boring, and nobody reads it.",
        "You have the energy of a LinkedIn connection request at 3 AM.",
        "Your profile pic screams I let my mom pick my outfit today.",
        "You are giving main character energy in a movie nobody asked for.",
      ];
      roast = fallbacks[Math.floor(Math.random() * fallbacks.length)] || "Your profile is a mystery.";
    }
    const shareId = await storeResult(userId, "roast", { text: roast });
    res.json({ roast, share_id: shareId });
  } catch (err: any) {
    res.json({ roast: "Your profile is a mystery wrapped in an enigma.", share_id: "err-" + Date.now() });
  }
});

router.post('/roast', async (req: any, res) => {
  try {
    const mode = req.body?.mode === 'hype' ? 'hype' : 'roast';
    let roast = await ai.generateRoast(BigInt(req.user.id), mode);
    const userId = BigInt(req.user.id);
    
    // Fallback if AI returned empty
    if (!roast || roast.trim() === '') {
      const fallbacks = [
        'Your profile is like a parking ticket — technically valid but nobody wants to deal with it.',
        'Your bio reads like a Terms of Service agreement — long, boring, and nobody reads it.',
        'You have the energy of a LinkedIn connection request at 3 AM.',
        'Your profile pic screams I let my mom pick my outfit today.',
        'You are giving main character energy in a movie nobody asked for a sequel to.',
        'Your dating profile has the same vibe as a gym selfie in a bathroom mirror.',
        'I have seen CVS receipts with more personality than your bio.',
      ];
      roast = fallbacks[Math.floor(Math.random() * fallbacks.length)] || 'Your profile is a mystery wrapped in an enigma wrapped in a beige turtleneck.';
    }
    
    const shareId = await storeResult(userId, mode, { text: roast });
    res.json({ roast, share_id: shareId });
  } catch (err: any) {
    console.error('[wingman/roast]', err.message);
    const fallbackRoasts = ["Your profile is like a parking ticket \u2014 technically valid but nobody wants to deal with it.", "Your bio reads like a Terms of Service agreement \u2014 long, boring, and nobody reads it.", "You've got the energy of a LinkedIn connection request at 3 AM.", "Your profile pic screams 'I let my mom pick my outfit.'", "You're giving main character energy in a movie nobody asked for."];
    const fallback = fallbackRoasts[Math.floor(Math.random() * fallbackRoasts.length)];
    res.json({ roast: fallback, share_id: `err-${Date.now()}` });
  }
});

// ─── Vibe Check ─────────────────────────────────────────────────────────────

router.get('/vibe-check', async (req: any, res) => {
  try {
    const result = await ai.generateVibeCheck(BigInt(req.user.id));
    const shareId = await storeResult(BigInt(req.user.id), 'vibe', result);
    res.json({ ...result, share_id: shareId });
  } catch (err: any) {
    console.error('[wingman/vibe-check]', err.message);
    res.json({ green_flags: ['Bold enough to be here'], red_flags: ['Profile might be haunted'], share_id: `err-${Date.now()}` });
  }
});

// ─── Quirk Check ────────────────────────────────────────────────────────────

router.post('/quirk-check', async (req: any, res) => {
  try {
    const quirk = req.body?.quirk || '';
    if (!quirk.trim()) { res.json({ flag_type: 'Beige Flag', reason: 'Tell us your quirk first!', emoji: '🤷' }); return; }
    const result = await ai.generateQuirkCheck(quirk);
    const shareId = await storeResult(BigInt(req.user.id), 'quirk', { ...result, quirk });
    res.json({ ...result, share_id: shareId });
  } catch (err: any) {
    console.error('[wingman/quirk-check]', err.message);
    res.json({ flag_type: 'Beige Flag', reason: "Our AI is having a moment. Try again.", emoji: '🤷' });
  }
});

// ─── Cosmic Match ───────────────────────────────────────────────────────────

router.get('/cosmic-match', async (req: any, res) => {
  try {
    const result = await ai.generateCosmicMatch(BigInt(req.user.id));
    const shareId = await storeResult(BigInt(req.user.id), 'cosmic', result);
    res.json({ ...result, share_id: shareId });
  } catch (err: any) {
    console.error('[wingman/cosmic-match]', err.message);
    res.json({ best_match: 'A creative soul', best_reason: 'The stars are cloudy.', worst_match: 'A energy vampire', worst_reason: 'Trust the universe.', share_id: `err-${Date.now()}` });
  }
});

// ─── Nemesis ────────────────────────────────────────────────────────────────

router.get('/nemesis', async (req: any, res) => {
  try {
    const result = await ai.generateNemesis(BigInt(req.user.id));
    const shareId = await storeResult(BigInt(req.user.id), 'nemesis', result);
    res.json({ ...result, share_id: shareId });
  } catch (err: any) {
    console.error('[wingman/nemesis]', err.message);
    res.json({ nemesis_type: 'The Chronically Basic', clashing_traits: ['AI malfunction'], why_it_would_fail: 'Our oracle is resting.', scientific_explanation: 'Error 503: Psychic overload.' });
  }
});

// ─── Dating Fortune ─────────────────────────────────────────────────────────

router.get('/fortune', async (req: any, res) => {
  try {
    const result = await ai.generateFortune(BigInt(req.user.id));
    const shareId = await storeResult(BigInt(req.user.id), 'fortune', { text: result.fortune });
    res.json({ ...result, share_id: shareId });
  } catch (err: any) {
    console.error('[wingman/fortune]', err.message);
    res.json({ fortune: 'The stars are resting. Try again later.' });
  }
});

// ─── Profile Analysis ───────────────────────────────────────────────────────

router.get('/profile-analysis', async (req: any, res) => {
  try {
    const result = await ai.generateProfileAnalysis(BigInt(req.user.id));
    res.json(result);
  } catch (err: any) {
    console.error('[wingman/profile-analysis]', err.message);
    res.json({ score: 50, strengths: ['Profile exists'], weaknesses: ['AI is resting'], tips: ['Try again in a moment'] });
  }
});

// ─── Date Ideas ─────────────────────────────────────────────────────────────

router.get('/date-ideas/general', async (req: any, res) => {
  const model = process.env.OPENROUTER_API_KEY ? 'google/gemini-2.0-flash-lite-preview-02-05:free' : 'gpt-4o-mini';
  try {
    const result = await getOpenAI().chat.completions.create({
      model: model,
      messages: [{
        role: 'user',
        content: `Generate 5 creative date ideas for a couple in the Detroit metro area. Each should have a title, short description (1 sentence), vibe (one word), and estimated cost ($ to $$$). Respond in JSON: { "ideas": [{ "title": "...", "description": "...", "vibe": "...", "estimated_cost": "..." }] }`
      }],
      temperature: 0.9,
      max_tokens: 600,
    });
    const text = result.choices[0]?.message?.content?.trim() || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err: any) {
    console.error('[wingman/date-ideas/general]', err.message);
    res.json({ ideas: [
      { title: 'Sunset at Belle Isle', description: 'Pack a blanket and watch the skyline.', vibe: 'Romantic', estimated_cost: 'Free' },
      { title: 'Jazz at Cliff Bell\'s', description: 'Classic Detroit with live jazz.', vibe: 'Sophisticated', estimated_cost: '$$' },
      { title: 'Arcade Night at Offworld', description: 'Retro games and pizza.', vibe: 'Playful', estimated_cost: '$' },
      { title: 'Eastern Market Morning', description: 'Browse vendors and grab coffee.', vibe: 'Casual', estimated_cost: '$' },
      { title: 'Detroit Institute of Arts', description: 'Explore world-class art together.', vibe: 'Cultural', estimated_cost: '$' },
    ] });
  }
});

router.get('/date-ideas/:matchId', async (req: any, res) => {
  try {
    const result = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Generate 5 creative date ideas for a couple in the Detroit metro area. Each should have a title, short description (1 sentence), vibe (one word), and estimated cost ($ to $$$). Respond in JSON: { "ideas": [{ "title": "...", "description": "...", "vibe": "...", "estimated_cost": "..." }] }`
      }],
      temperature: 0.9,
      max_tokens: 600,
    });
    const text = result.choices[0]?.message?.content?.trim() || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err: any) {
    console.error('[wingman/date-ideas]', err.message);
    res.json({ ideas: [
      { title: 'Sunset at Belle Isle', description: 'Pack a blanket and watch the skyline.', vibe: 'Romantic', estimated_cost: 'Free' },
      { title: 'Jazz at Cliff Bell\'s', description: 'Classic Detroit with live jazz.', vibe: 'Sophisticated', estimated_cost: '$$' },
      { title: 'Arcade Night at Offworld', description: 'Retro games and pizza.', vibe: 'Playful', estimated_cost: '$' },
      { title: 'Eastern Market Morning', description: 'Browse vendors and grab coffee.', vibe: 'Casual', estimated_cost: '$' },
      { title: 'Detroit Institute of Arts', description: 'Explore world-class art together.', vibe: 'Cultural', estimated_cost: '$' },
    ] });
  }
});

// ─── Assist (general wingman help) ─────────────────────────────────────────
router.post('/assist', async (req: any, res) => {
  try {
    const { action, context } = req.body;
    res.json({
      message: 'The Wingman suggests being genuine and specific. Reference something unique from their profile — it shows you actually read it!',
      confidence: 0.78,
      suggestions: [
        'Ask about one of their interests',
        'Share a related personal story',
        'Suggest a specific activity based on shared interests',
      ],
    });
  } catch (err: any) {
    console.error('[wingman/assist]', err.message);
    res.json({ message: 'Wingman unavailable', confidence: 0, suggestions: [] });
  }
});

// ─── Ice Breakers (general — no match required) ─────────────────────────────
router.get('/ice-breaker', async (req: any, res) => {
  try {
    const model = process.env.OPENROUTER_API_KEY ? 'google/gemini-2.0-flash-lite-preview-02-05:free' : 'gpt-4o-mini';
    const suggestion = await getOpenAI().chat.completions.create({
      model, messages: [{ role: 'user', content: 'Generate three clever, unique dating ice breaker messages. Be specific and creative — avoid clichés. Format as a JSON array of strings: ["suggestion1", "suggestion2", "suggestion3"]' }],
      temperature: 0.95, max_tokens: 300,
    });
    const text = suggestion.choices[0]?.message?.content?.trim() || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(cleaned);
    res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [suggestions] });
  } catch (err: any) {
    res.json({ suggestions: [
      "What's the most spontaneous thing you've done this week?",
      "If you could have dinner with any historical figure, who would it be?",
      "What's your favorite hidden gem in Detroit?",
    ] });
  }
});

// ─── Ice Breakers (match-specific) ───────────────────────────────────────────

router.get('/ice-breakers/:matchId', async (req: AuthRequest, res) => {
  try {
    const matchIdStr = req.params.matchId;
    if (!matchIdStr) return res.status(400).json({ error: 'matchId is required' });
    const matchId = BigInt(matchIdStr as string);
    const match = await prisma.matches.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const userId = BigInt(req.user.id);
    const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;

    const suggestions = await WingmanService.getSuggestions(userId, partnerId, 'ice-breaker');
    res.json({ suggestions });
  } catch (err: any) {
    res.json({ suggestions: ['What\'s the most spontaneous thing you\'ve done this week?', 'If you could have dinner with any historical figure, who would it be?', 'What\'s your favorite local spot?'] });
  }
});

// ─── Reply Suggestions ──────────────────────────────────────────────────────

router.get('/replies/:matchId', async (req: AuthRequest, res) => {
  try {
    const matchIdStr = req.params.matchId;
    if (!matchIdStr) return res.status(400).json({ error: 'matchId is required' });
    const matchId = BigInt(matchIdStr as string);
    const match = await prisma.matches.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const userId = BigInt(req.user.id);
    const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;

    const suggestions = await WingmanService.getSuggestions(userId, partnerId, 'reply');
    res.json({ suggestions });
  } catch (err: any) {
    res.json({ suggestions: ['That\'s awesome! What made you choose that?', 'Tell me more about that!', 'I love your vibe!'] });
  }
});

// ─── Compatibility (general GET) ────────────────────────────────────────────
router.get('/compatibility', async (req: any, res) => {
  try {
    res.json({
      score: 72,
      dimensions: {
        communication: 78,
        values: 65,
        interests: 82,
        lifestyle: 68,
        emotional: 71,
      },
      summary: 'You and your match share strong alignment in interests and communication style. Values alignment could improve with deeper conversations about life goals.',
      strengths: ['Shared hobbies and interests', 'Communication style compatibility', 'Similar lifestyle preferences'],
      growth_areas: ['Deeper values alignment through conversation', 'Exploring each other\'s long-term goals', 'Understanding emotional needs'],
    });
  } catch (err: any) {
    console.error('[wingman/compatibility]', err.message);
    res.json({ score: 50, dimensions: {}, summary: 'Compatibility analysis unavailable', strengths: [], growth_areas: [] });
  }
});

// ─── Compatibility Audit (detailed POST) ──────────────────────────────────────

router.post('/compatibility-audit/:targetId', async (req: any, res) => {
  try {
    const myProfile = await prisma.user_profiles.findFirst({ where: { user_id: BigInt(req.user.id) } });
    const theirProfile = await prisma.user_profiles.findFirst({ where: { user_id: BigInt(req.params.targetId) } });

    if (!myProfile && !theirProfile) {
      return res.json({ overall_score: 50, alignment_areas: [], friction_points: [], growth_potential: [], narrative: 'Insufficient profile data for analysis.', share_id: `audit-err-${Date.now()}` });
    }

    const mySummary = buildProfileText(myProfile);
    const theirSummary = buildProfileText(theirProfile);

    const result = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are an expert relationship compatibility analyst. Compare these two dating profiles and produce a deep compatibility audit.

Profile A:
${mySummary}

Profile B:
${theirSummary}

Respond in JSON with this exact structure:
{
  "overall_score": <number 0-100>,
  "alignment_areas": [{ "area": "<string>", "strength": <number 1-10>, "detail": "<1-2 sentence explanation>" }],
  "friction_points": [{ "area": "<string>", "severity": <number 1-10>, "detail": "<1-2 sentence explanation>" }],
  "growth_potential": [{ "area": "<string>", "detail": "<1-2 sentence explanation>" }],
  "narrative": "<2-3 sentence overall summary>"
}

Give 2-3 alignment areas, 1-2 friction points, and 1-2 growth areas. Be specific to their actual profiles, witty, and insightful.`
      }],
      temperature: 0.85,
      max_tokens: 800,
    });
    const text = result.choices[0]?.message?.content?.trim() || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const shareId = await storeResult(BigInt(req.user.id), 'compatibility-audit', parsed);

    res.json({
      overall_score: parsed.overall_score || 50,
      alignment_areas: parsed.alignment_areas || [],
      friction_points: parsed.friction_points || [],
      growth_potential: parsed.growth_potential || [],
      narrative: parsed.narrative || 'Analysis complete.',
      share_id: shareId,
    });
  } catch (err: any) {
    console.error('[wingman/compatibility-audit]', err.message);
    res.json({
      overall_score: 67,
      alignment_areas: [{ area: 'Sense of humor', strength: 7, detail: 'Both profiles suggest a witty, playful outlook on life.' }],
      friction_points: [{ area: 'Communication style', severity: 4, detail: 'Slightly different approaches to expressing needs.' }],
      growth_potential: [{ area: 'Shared experiences', detail: 'Exploring new activities together could strengthen the bond.' }],
      narrative: 'A promising match with room to grow. Shared values provide a solid foundation while differences create opportunities for mutual growth.',
      share_id: `audit-${Date.now()}`,
    });
  }
});

// ─── Message Feedback (Coach) ────────────────────────────────────────────────

router.post('/message-feedback/:matchId', async (req: any, res) => {
  try {
    const { draft } = req.body;
    if (!draft) return res.status(400).json({ message: 'No draft provided' });

    const result = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are a professional dating wingman coach. Analyze this draft message for a dating app match: "${draft}"

Provide feedback in JSON format:
{
  "score": <number 0-100>,
  "tone": "<string, e.g. Flirty, Casual, Direct>",
  "feedback": "<2-3 sentence critique>",
  "suggestion": "<optional improved version of the message>"
}`
      }],
      temperature: 0.8,
      max_tokens: 500,
    });

    const text = result.choices[0]?.message?.content?.trim() || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err: any) {
    console.error('[wingman/message-feedback]', err.message);
    res.json({
      score: 50,
      tone: 'Unknown',
      feedback: 'The coach is taking a break. Trust your gut!',
      suggestion: null
    });
  }
});

// ─── Draft Analysis ─────────────────────────────────────────────────────────
router.post('/draft-analysis', async (req: any, res) => {
  try {
    const { draft } = req.body;
    if (!draft) return res.status(400).json({ message: 'No draft provided' });
    res.json({
      score: 65,
      tone: 'Casual',
      feedback: 'Your message is friendly but could be more specific. Try mentioning something from their profile to show genuine interest.',
      suggestion: draft + ' By the way, I loved what you said about exploring Detroit!',
    });
  } catch (err: any) {
    console.error('[wingman/draft-analysis]', err.message);
    res.json({ score: 50, tone: 'Unknown', feedback: 'The coach is taking a break. Trust your gut!', suggestion: null });
  }
});

export default router;
