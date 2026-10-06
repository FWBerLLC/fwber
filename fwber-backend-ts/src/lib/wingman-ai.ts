/**
 * OpenAI-powered wingman service.
 * All profile novelty tools use GPT to generate dynamic, personalized content.
 */

import OpenAI from 'openai';
import Replicate from 'replicate';
import * as fal from "@fal-ai/serverless-client";
import prisma from './prisma.js';

/**
 * Configure AI Providers
 * Primary: NVIDIA NIM (Free tier)
 * Fallback: OpenRouter (Free models)
 */
const nvidia = process.env.NVIDIA_API_KEY ? new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
}) : null;

const openrouter = process.env.OPENROUTER_API_KEY ? new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.fwber.site',
    'X-Title': 'fwber',
  }
}) : null;

const legacyOpenai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const replicate = process.env.REPLICATE_API_TOKEN ? new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
}) : null;

// Initialize fal.ai
if (process.env.FAL_KEY) {
  process.env.FAL_API_KEY = process.env.FAL_KEY;
}

/** Fetch a user's profile as a plain summary string for prompts */
async function getProfileSummary(userId: bigint): Promise<string> {
  const prisma = (await import('../lib/prisma.js')).default;
  const profile = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
  if (!profile) return 'No profile data available.';

  const prefs = typeof profile.preferences === 'string' ? JSON.parse(profile.preferences) : profile.preferences;
  const lookingFor = typeof profile.looking_for === 'string' ? JSON.parse(profile.looking_for) : profile.looking_for;
  const interests = typeof profile.interests === 'string' ? JSON.parse(profile.interests) : profile.interests;

  const parts: string[] = [];
  if (profile.display_name) parts.push(`Name: ${profile.display_name}`);
  if (profile.gender) parts.push(`Gender: ${profile.gender}`);
  if (profile.bio) parts.push(`Bio: ${profile.bio}`);
  if (profile.date_of_birth || profile.birthdate) {
    const dob = profile.date_of_birth || profile.birthdate;
    const age = dob ? Math.floor((Date.now() - new Date(dob as any).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    if (age) parts.push(`Age: ${age}`);
  }
  if (profile.location_description) parts.push(`Location: ${profile.location_description}`);
  if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
  if (profile.education) parts.push(`Education: ${profile.education}`);
  if (profile.height_cm) parts.push(`Height: ${profile.height_cm}cm`);
  if (profile.body_type) parts.push(`Body type: ${profile.body_type}`);
  if (profile.religion) parts.push(`Religion: ${profile.religion}`);
  if (profile.political_views) parts.push(`Politics: ${profile.political_views}`);
  if (profile.sexual_orientation) parts.push(`Orientation: ${profile.sexual_orientation}`);
  if (profile.relationship_style) parts.push(`Relationship style: ${profile.relationship_style}`);
  if (profile.drinking_status) parts.push(`Drinking: ${profile.drinking_status}`);
  if (profile.smoking_status) parts.push(`Smoking: ${profile.smoking_status}`);
  if (profile.cannabis_status) parts.push(`Cannabis: ${profile.cannabis_status}`);
  if (profile.zodiac_sign) parts.push(`Zodiac: ${profile.zodiac_sign}`);
  if (Array.isArray(interests) && interests.length) parts.push(`Interests: ${interests.join(', ')}`);
  if (Array.isArray(lookingFor) && lookingFor.length) parts.push(`Looking for: ${lookingFor.join(', ')}`);
  if (prefs?.hobbies?.length) parts.push(`Hobbies: ${prefs.hobbies.join(', ')}`);
  if (prefs?.occupation) parts.push(`Occupation preference: ${prefs.occupation}`);

  return parts.join('\n');
}

/** Generic AI chat completion helper with multi-provider failover */
// Helper: race an AI call against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

// Cache provider failures to skip recently-failed providers
const providerFailures = new Map<string, number>();
const FAILURE_CACHE_MS = 5 * 60 * 1000; // Skip failed providers for 5 minutes

function providerAvailable(name: string): boolean {
  const lastFail = providerFailures.get(name);
  if (!lastFail) return true;
  if (Date.now() - lastFail > FAILURE_CACHE_MS) {
    providerFailures.delete(name);
    return true;
  }
  return false;
}

function markProviderFailed(name: string): void {
  providerFailures.set(name, Date.now());
}

export async function generateText(system: string, user: string, temperature = 0.9): Promise<string> {
  const TIMEOUT_MS = 10000; // 10 second overall timeout
  const NVIDIA_TIMEOUT = 5000; // NVIDIA free tier is slow, shorter timeout

  // 1. Try NVIDIA NIM (Meta Llama 3.1 8B Instruct)
  if (nvidia && providerAvailable('nvidia')) {
    try {
      const resp = await withTimeout(nvidia.chat.completions.create({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: 800,
      }), NVIDIA_TIMEOUT, 'NVIDIA');
      return resp.choices[0]?.message?.content?.trim() || '';
    } catch (err: any) {
      console.error('[AI] NVIDIA NIM failed, falling back...', err.message);
      markProviderFailed('nvidia');
    }
  }

  // 2. Try OpenRouter (Google Gemini 2.0 Flash Lite Free)
  if (openrouter && providerAvailable('openrouter')) {
    try {
      const resp = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: 800,
      });
      return resp.choices[0]?.message?.content?.trim() || '';
    } catch (err: any) {
      console.error('[AI] OpenRouter failed, falling back...', err.message);
      markProviderFailed('openrouter');
    }
  }

  // 3. Last Resort: Legacy OpenAI Key
  if (legacyOpenai && providerAvailable('openai')) {
    try {
      const resp = await withTimeout(legacyOpenai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: 800,
      }), TIMEOUT_MS, 'OpenAI');
      return resp.choices[0]?.message?.content?.trim() || '';
    } catch (err: any) {
      console.error('[AI] Legacy OpenAI failed.', err.message);
      markProviderFailed('openai');
    }
  }

  return '';
}

// ─── Roast ──────────────────────────────────────────────────────────────────

export async function generateRoast(userId: bigint, mode: 'roast' | 'hype'): Promise<string> {
  const profile = await getProfileSummary(userId);
  const isRoast = mode === 'roast';

  const system = isRoast
    ? `You are a savage, witty dating profile roaster. Be brutally funny, creative, and specific to their profile. Use clever metaphors and pop culture references. Keep it under 4 sentences. Never be mean-spirited — roast with love. Be unique every time.`
    : `You are an enthusiastic, hyped-up dating profile cheerleader. Be over-the-top positive, creative, and specific to their profile. Use superlatives, emojis, and energy. Keep it under 4 sentences. Be unique every time.`;

  return generateText(system, `Here's the dating profile:\n\n${profile}\n\n${isRoast ? 'Roast them!' : 'Hype them up!'}`);
}

export async function generatePublicRoast(name: string, job: string, trait: string, mode: 'roast' | 'hype'): Promise<string> {
  const isRoast = mode === 'roast';
  const system = isRoast
    ? `You are a savage, witty dating profile roaster. Be brutally funny and creative. Keep it under 4 sentences. Never be mean-spirited. Be unique every time.`
    : `You are an enthusiastic hyped-up profile cheerleader. Be over-the-top positive with emojis and energy. Keep it under 4 sentences. Be unique every time.`;

  return generateText(system, `Name: ${name}, Job: ${job}, Trait: ${trait}\n\n${isRoast ? 'Roast them!' : 'Hype them up!'}`);
}

// ─── Vibe Check ─────────────────────────────────────────────────────────────

export async function generateVibeCheck(userId: bigint): Promise<{ green_flags: string[]; red_flags: string[] }> {
  const profile = await getProfileSummary(userId);
  const result = await generateText(
    `You are a witty dating profile analyst. Given a dating profile, generate 3-5 specific green flags and 2-4 specific red flags based on their actual profile data. Be clever, funny, and insightful. Each flag should be 3-8 words. Respond in JSON: { "green_flags": [...], "red_flags": [...] }`,
    `Profile:\n${profile}`,
    0.85
  );
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      green_flags: ['Has a profile (that\'s a start)', 'Bold enough to be here', 'Gives off main character energy'],
      red_flags: ['Profile might be haunted', 'Could be a catfish', 'Suspiciously vague'],
    };
  }
}

// ─── Quirk Check ────────────────────────────────────────────────────────────

export async function generateQuirkCheck(quirk: string): Promise<{ flag_type: string; reason: string; emoji: string }> {
  const result = await generateText(
    `You are a witty dating profile analyst. Given a personal quirk, classify it as "Green Flag", "Red Flag", or "Beige Flag" and explain why in a funny, clever way (1-2 sentences). Respond in JSON: { "flag_type": "...", "reason": "...", "emoji": "..." }`,
    `Quirk: "${quirk}"`,
    0.9
  );
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { flag_type: 'Beige Flag', reason: "It's not a red flag, it's not a green flag... it just *is*.", emoji: '🤷' };
  }
}

// ─── Profile Analysis ───────────────────────────────────────────────────────

export async function generateProfileAnalysis(userId: bigint): Promise<{
  score: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
}> {
  const profile = await getProfileSummary(userId);
  const result = await generateText(
    `You are a dating profile expert. Analyze the profile and give a score 0-100, 2-3 strengths, 2-3 weaknesses, and 2-3 actionable tips. Be specific to their actual profile data. Respond in JSON: { "score": number, "strengths": [...], "weaknesses": [...], "tips": [...] }`,
    `Profile:\n${profile}`,
    0.7
  );
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      score: 50,
      strengths: ['Profile exists'],
      weaknesses: ['Could use more details'],
      tips: ['Add more photos and a longer bio'],
    };
  }
}

// ─── Cosmic Match ───────────────────────────────────────────────────────────

export async function generateCosmicMatch(userId: bigint): Promise<{
  best_match: string;
  best_reason: string;
  worst_match: string;
  worst_reason: string;
}> {
  const profile = await getProfileSummary(userId);
  const result = await generateText(
    `You are a mystical dating oracle with cosmic energy. Given someone's profile, predict their best and worst match personality types. Be creative, funny, specific to their profile. Respond in JSON: { "best_match": "...", "best_reason": "...", "worst_match": "...", "worst_reason": "..." }`,
    `Profile:\n${profile}`,
    0.95
  );
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      best_match: 'A creative soul who shares your curiosity',
      best_reason: 'Your combined energy creates a magnetic connection.',
      worst_match: 'Someone who fears spontaneity',
      worst_reason: 'Your free spirit would clash with rigidity.',
    };
  }
}

// ─── Nemesis ────────────────────────────────────────────────────────────────

export async function generateNemesis(userId: bigint): Promise<{
  nemesis_type: string;
  clashing_traits: string[];
  why_it_would_fail: string;
  scientific_explanation: string;
}> {
  const profile = await getProfileSummary(userId);
  const result = await generateText(
    `You are a dating profile analyst with a dark sense of humor. Given someone's profile, describe their dating nemesis — the exact type of person who would be their worst match. Be specific, witty, and reference their actual traits. Respond in JSON: { "nemesis_type": "...", "clashing_traits": ["...", "..."], "why_it_would_fail": "...", "scientific_explanation": "..." }`,
    `Profile:\n${profile}`,
    0.95
  );
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      nemesis_type: 'The Chronically Basic',
      clashing_traits: ['Orders pumpkin spice lattes unironically', 'Thinks hiking is a personality trait'],
      why_it_would_fail: 'You need depth; they need a filter.',
      scientific_explanation: 'Opposites attract, but only in magnetism — not in conversation.',
    };
  }
}

// ─── Dating Fortune ─────────────────────────────────────────────────────────

export async function generateFortune(userId: bigint): Promise<{ fortune: string }> {
  const profile = await getProfileSummary(userId);
  const result = await generateText(
    `You are a mystical dating fortune teller. Given someone's profile, generate a creative, personalized dating fortune — a prediction about their love life. Be specific to their profile, witty, and optimistic. 2-3 sentences max.`,
    `Profile:\n${profile}`,
    0.95
  );
  return { fortune: result || 'The stars are aligning in your favor. A surprise encounter awaits.' };
}

// ─── Avatar Generation ──────────────────────────────────────────────────────

export async function generateAvatarPrompt(userId: bigint): Promise<string> {
  const profile = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
  if (!profile) return 'A mysterious and intriguing person.';

  const system = `You are an expert prompt engineer for DALL-E 3 and Stable Diffusion.
Given a user's physical profile and lifestyle, create a highly detailed, photorealistic prompt for an avatar image.
The avatar should look like a high-end social media profile picture.
Focus on lighting, clothing style, and physical features.
Output ONLY the prompt text. No preamble.`;

  const userPrompt = `
Physical Attributes:
- Height: ${profile.height_cm ? `${profile.height_cm}cm` : 'average'}
- Body Type: ${profile.body_type || 'average'}
- Hair: ${profile.hair_color || 'natural'} ${profile.facial_hair ? `with ${profile.facial_hair}` : ''}
- Eyes: ${profile.eye_color || 'expressive'}
- Tone: ${profile.skin_tone || 'natural'}
- Ethnicity: ${profile.ethnicity || 'mixed'}
- Style: ${profile.clothing_style || 'casual stylish'}
- Vibe: ${profile.fitness_level || 'healthy'}
- Current Emotion: ${profile.current_emotion || 'neutral'}

The avatar should reflect their current emotion in their expression and the lighting/atmosphere of the image.
Create a professional, attractive avatar prompt.`;

  return generateText(system, userPrompt, 0.7);
}

export async function generateAvatarImage(userId: bigint, style = 'realistic'): Promise<string> {
  const prompt = await generateAvatarPrompt(userId);

  // Mark as generating
  await prisma.user_profiles.updateMany({
    where: { user_id: userId },
    data: { 
      avatar_prompt: prompt,
      avatar_status: 'generating'
    }
  });

  try {
    let imageUrl: string | undefined;

    // 1. Try fal.ai (Flux Pro or Realism LoRA) - Fastest and extremely high quality
    if (process.env.FAL_KEY || process.env.FAL_API_KEY) {
      try {
        console.log('[AI Avatar] Generating with fal.ai...');
        const result: any = await fal.subscribe("fal-ai/flux-pro", {
          input: {
            prompt: `Photorealistic high-end profile picture. ${prompt} Style: ${style}. High resolution, 4k, professional lighting.`,
            image_size: "square_hd",
            num_images: 1,
            enable_safety_checker: true,
            sync_mode: true
          },
        });
        if (result && (result as any).images && (result as any).images[0]) {
          imageUrl = (result as any).images[0].url;
        }
      } catch (err: any) {
        console.error('[AI Avatar] fal.ai failed:', err.message);
      }
    }

    // 2. Try Replicate (Flux Schnell) - Great value/speed ratio
    if (!imageUrl && replicate) {
      try {
        console.log('[AI Avatar] Generating with Replicate...');
        const output: any = await replicate.run(
          "black-forest-labs/flux-schnell",
          {
            input: {
              prompt: `Photorealistic high-end profile picture. ${prompt} Style: ${style}. High resolution, 4k, professional lighting.`,
              num_outputs: 1,
              aspect_ratio: "1:1",
              output_format: "webp",
              output_quality: 90
            }
          }
        );
        
        if (Array.isArray(output) && output[0]) {
          imageUrl = output[0];
        } else if (typeof output === 'string') {
          imageUrl = output;
        }
      } catch (err: any) {
        console.error('[AI Avatar] Replicate failed:', err.message);
      }
    }

    // 3. Fallback to OpenAI DALL-E 3
    if (!imageUrl && legacyOpenai) {
      console.log('[AI Avatar] Falling back to DALL-E 3...');
      const response = await legacyOpenai.images.generate({
        model: "dall-e-3",
        prompt: `Photorealistic high-end profile picture. ${prompt} Style: ${style}. High resolution, 4k, professional lighting.`,
        n: 1,
        size: "1024x1024",
      });
      if (response.data && response.data[0]) {
        imageUrl = response.data[0].url;
      }
    }

    if (imageUrl) {
      const provider = imageUrl.includes('fal.ai') ? 'fal' : (imageUrl.includes('replicate') ? 'replicate' : 'openai');
      
      await prisma.user_profiles.updateMany({
        where: { user_id: userId },
        data: { 
          avatar_url: imageUrl,
          avatar_status: 'completed'
        }
      });

      // Also add to photos table as a primary photo
      await prisma.photos.create({
        data: {
          user_id: userId,
          file_path: imageUrl,
          is_primary: true,
          is_private: false,
          metadata: { source: 'ai', provider } as any,
          filename: `avatar-${userId}-${Date.now()}.webp`,
          original_filename: 'ai-avatar.webp',
          mime_type: 'image/webp',
          file_size: 0
        }
      });

      return imageUrl;
    }
    
    throw new Error('No image generation provider available or generation failed');
  } catch (err: any) {
    console.error('[AI Avatar] Generation failed:', err.message);
    await prisma.user_profiles.updateMany({
      where: { user_id: userId },
      data: { avatar_status: 'failed' }
    });
    return '';
  }
}
