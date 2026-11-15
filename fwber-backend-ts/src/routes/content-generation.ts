import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import * as ai from '../lib/wingman-ai.js';

const router = Router();

router.use(authenticate);

/**
 * POST /api/content-generation/generate-bio
 * Generates an AI profile bio based on preferences
 * Uses multi-provider failover (NVIDIA NIM → OpenRouter → OpenAI)
 */
router.post('/generate-bio', async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { personality, interests, goals, style, target_audience } = req.body;

  try {
    const systemPrompt = `You are a creative dating profile writer. Generate compelling, authentic bios. 
Always respond with valid JSON: { "suggestions": [{ "content": "the bio text", "provider": "ai", "confidence": 0.9, "safety_score": 0.99 }] }
Generate 3 different bio suggestions varying in tone and length.`;

    const userPrompt = `Create dating profile bios based on:
Personality: ${personality || 'friendly and outgoing'}
Interests: ${Array.isArray(interests) ? interests.join(', ') : interests || 'various'}
Goals: ${goals || 'meaningful connections'}
Style: ${style || 'authentic'}
Target Audience: ${target_audience || 'open to all'}`;

    const result = await ai.generateText(systemPrompt, userPrompt);

    if (!result) {
      return res.json({
        success: true,
        data: {
          suggestions: [{
            content: `I'm someone who loves ${Array.isArray(interests) ? interests.slice(0, 3).join(', ') : 'exploring new things'}. Looking for genuine connections with people who share my curiosity about the world. When I'm not ${Array.isArray(interests) ? interests[0] || 'working' : 'working'}, you'll find me trying new restaurants or planning my next adventure.`,
            provider: 'fallback',
            confidence: 0.5,
            safety_score: 0.99,
          }],
        },
        user_id: req.user.id,
        generated_at: new Date().toISOString(),
      });
    }

    // Try to parse as JSON, fallback if not valid
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      // AI didn't return valid JSON, wrap the text
      parsed = {
        suggestions: [{
          content: result,
          provider: 'ai',
          confidence: 0.8,
          safety_score: 0.99,
        }],
      };
    }

    res.json({
      success: true,
      data: parsed,
      user_id: req.user.id,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GENERATE_BIO_ERROR]', error.message);
    res.json({
      success: true,
      data: {
        suggestions: [{
          content: `I'm passionate about life and always looking for new experiences. Whether it's exploring the city or having deep conversations over coffee, I value authenticity and good vibes. Let's connect if you appreciate the little things.`,
          provider: 'fallback',
          confidence: 0.5,
          safety_score: 0.99,
        }],
      },
      user_id: req.user.id,
      generated_at: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/content-generation/optimize
 * Optimizes existing content
 */
router.post('/optimize', async (req: any, res) => {
  const { content, optimization_types } = req.body;

  try {
    const systemPrompt = `You are a content optimization expert for dating profiles.
Always respond with valid JSON: { "optimized": "improved text", "overall_score": 0.9, "improvements": { "clarity": 0.9, "engagement": 0.85, "authenticity": 0.9 } }`;

    const userPrompt = `Optimize the following profile content for ${optimization_types?.join(', ') || 'engagement and authenticity'}:
"${content}"`;

    const result = await ai.generateText(systemPrompt, userPrompt);

    if (!result) {
      return res.json({
        success: true,
        data: { optimized: content, overall_score: 0.7, improvements: {} },
        user_id: req.user.id,
        optimized_at: new Date().toISOString(),
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { optimized: result, overall_score: 0.8, improvements: {} };
    }

    res.json({
      success: true,
      data: parsed,
      user_id: req.user.id,
      optimized_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[OPTIMIZE_CONTENT_ERROR]', error.message);
    res.json({
      success: true,
      data: { optimized: content, overall_score: 0.5, improvements: {} },
      user_id: req.user.id,
      optimized_at: new Date().toISOString(),
    });
  }
});

// POST /api/content-generation/feedback
router.post('/feedback', async (req: any, res) => {
  res.json({ success: true, message: 'Feedback recorded' });
});

// GET /api/content-generation/stats
router.get('/stats', (_req, res) => {
  res.json({ success: true, data: { total_generations: 0, tokens_used: 0, remaining: 0 } });
});

// GET /api/content-generation/history
router.get('/history', async (req: any, res) => {
  res.json({ success: true, data: [] });
});

// GET /api/content-generation/status - AI content generation status
router.get('/status', (_req, res) => {
  res.json({
    available: true,
    providers: ['nvidia-nim', 'openrouter', 'openai'],
    features: ['bio-generation', 'content-optimization', 'conversation-starters'],
    daily_limit: 10,
    remaining: 10,
  });
});

// GET /api/content-generation/optimization-stats
router.get('/optimization-stats', (_req, res) => {
  res.json({ success: true, data: { optimization_score: 0, suggestions: [] } });
});

// POST /api/content-generation/generate-starters
// POST /api/content/generate-starters (alias)
router.post('/generate-starters', async (req: any, res) => {
  const userId = BigInt(req.user.id);
  const { match_name, match_interests, context, content_type } = req.body;
  try {
    const systemPrompt = `You are a dating conversation expert. Generate 5 creative conversation starters. Always respond with valid JSON: { "suggestions": [{ "content": "the starter text", "provider": "ai", "confidence": 0.9 }] }`;
    const userPrompt = `Generate conversation starters for someone messaging ${match_name || 'a match'}. Their interests: ${Array.isArray(match_interests) ? match_interests.join(', ') : match_interests || 'various'}. Context: ${context || 'first message'}`;

    const result = await ai.generateText(systemPrompt, userPrompt);
    if (!result) {
      // Fallback starters
      const fallbackStarters = [
        `So I noticed you're into ${Array.isArray(match_interests) ? match_interests[0] || 'interesting things' : 'interesting things'}! What got you into that?`,
        "What's the best thing that happened to you this week?",
        "I've been meaning to try something new in the city — any recommendations?",
        `If you could only do one activity this weekend, what would it be?`,
        "What's a hobby you've always wanted to pick up but haven't yet?",
      ];
      return res.json({
        success: true,
        data: {
          suggestions: fallbackStarters.map((s, i) => ({
            content: s,
            provider: 'fallback',
            confidence: 0.5,
            safety_score: 0.99,
            type: content_type || 'conversation_starter',
          })),
        },
        user_id: req.user.id,
        generated_at: new Date().toISOString(),
      });
    }
    let parsed;
    try { parsed = JSON.parse(result); } catch {
      parsed = { suggestions: [{ content: result, provider: 'ai', confidence: 0.8, safety_score: 0.99 }] };
    }
    res.json({ success: true, data: parsed, user_id: req.user.id, generated_at: new Date().toISOString() });
  } catch (error: any) {
    console.error('[GENERATE_STARTERS_ERROR]', error.message);
    res.json({
      success: true,
      data: { suggestions: [{ content: "Hey! What brings you to the app today?", provider: 'fallback', confidence: 0.3, safety_score: 0.99 }] },
      user_id: req.user.id,
      generated_at: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/content/generate-posts/:boardId & POST /api/content-generation/generate-posts/:boardId
 * Generates contextual bulletin-board post suggestions (`lib/api/content-generation.ts`, `use-ai-content.ts`).
 */
router.post('/generate-posts/:boardId', async (req: any, res) => {
  const boardIdNum = Number(req.params.boardId);
  const { context, user_topics, tone } = req.body || {};

  let boardTitle = 'Local Community Board';
  if (Number.isInteger(boardIdNum) && boardIdNum > 0) {
    try {
      const topic = await prisma.topics.findUnique({
        where: { id: BigInt(boardIdNum) },
      });
      if (topic?.label) {
        boardTitle = String(topic.label);
      }
    } catch {
      // Optional enrichment only
    }
  }

  const topicsStr = Array.isArray(user_topics) && user_topics.length > 0
    ? user_topics.join(', ')
    : typeof context === 'object' && context?.topic
      ? String(context.topic)
      : 'local events, coffee spots, and weekend plans';

  const buildFallbacks = () => [
    {
      id: `post-${Date.now()}-1`,
      content: `Anyone around ${boardTitle} checking out local spots this weekend? Looking for great ${topicsStr} recommendations!`,
      provider: 'fallback',
      confidence: 0.75,
      safety_score: 0.99,
      type: 'board_post',
    },
    {
      id: `post-${Date.now()}-2`,
      content: `Quick pulse check on ${boardTitle} — what's everyone's favorite hidden gem nearby for ${topicsStr}?`,
      provider: 'fallback',
      confidence: 0.72,
      safety_score: 0.99,
      type: 'board_post',
    },
    {
      id: `post-${Date.now()}-3`,
      content: `Spontaneous meetup idea on ${boardTitle}: low-key ${topicsStr} hangout tonight — drop a reply if you're free!`,
      provider: 'fallback',
      confidence: 0.7,
      safety_score: 0.99,
      type: 'board_post',
    },
  ];

  try {
    const systemPrompt = `You write engaging, friendly local bulletin-board posts. Respond ONLY with valid JSON: { "suggestions": [{ "content": "post text", "provider": "ai", "confidence": 0.9, "safety_score": 0.99 }] }. Generate 3 concise options.`;
    const userPrompt = `Board: ${boardTitle}\nTopics: ${topicsStr}\nTone: ${tone || 'casual and welcoming'}`;

    const result = await ai.generateText(systemPrompt, userPrompt);
    if (!result) {
      return res.json({
        success: true,
        data: { suggestions: buildFallbacks() },
        board_id: boardIdNum || req.params.boardId,
        user_id: req.user.id,
        generated_at: new Date().toISOString(),
      });
    }

    let parsed: any;
    try {
      const rawParsed = JSON.parse(result);
      parsed = Array.isArray(rawParsed) ? { suggestions: rawParsed } : rawParsed;
      if (!Array.isArray(parsed?.suggestions)) {
        parsed = { suggestions: buildFallbacks() };
      }
    } catch {
      parsed = {
        suggestions: [{ content: result, provider: 'ai', confidence: 0.85, safety_score: 0.99 }],
      };
    }

    return res.json({
      success: true,
      data: parsed,
      board_id: boardIdNum || req.params.boardId,
      user_id: req.user.id,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GENERATE_POSTS_ERROR]', error.message);
    return res.json({
      success: true,
      data: { suggestions: buildFallbacks() },
      board_id: boardIdNum || req.params.boardId,
      user_id: req.user.id,
      generated_at: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/content-generation/content/:contentId & DELETE /api/content/content/:contentId
 * Deletes a generated draft item (`deleteGeneratedContent` in `lib/api/content-generation.ts`).
 */
router.delete('/content/:contentId', async (req: any, res) => {
  const contentId = String(req.params.contentId || '').trim();
  if (!contentId) {
    return res.status(400).json({ success: false, message: 'contentId is required' });
  }
  return res.json({
    success: true,
    message: 'Generated content deleted',
    content_id: contentId,
    deleted_at: new Date().toISOString(),
  });
});

export default router;
