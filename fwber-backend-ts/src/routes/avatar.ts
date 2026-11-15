import { Router, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { filePathToUrl } from '../lib/photos.js';
import { generateAvatarImage } from '../lib/wingman-ai.js';

/**
 * AI Avatar Studio Router (`/api/avatar`)
 *
 * Implements Pillar #2 of VISION.md ("The Anti-Catfish Guarantee — AI-generated
 * Avatars until mutual reveal") for `components/AvatarGenerationFlow.tsx`:
 *   - GET  /api/avatar/providers
 *   - GET  /api/avatar/physical-traits
 *   - POST /api/avatar/generate
 *   - POST /api/avatar/generate-from-photo
 *
 * Generation strategy:
 *   1. Persist updated physical traits onto `user_profiles` so future matches and
 *      regenerations stay synchronized.
 *   2. If a cloud image provider (`FAL_KEY`, `REPLICATE_API_TOKEN`, or
 *      `OPENAI_API_KEY`) is configured, attempt live Flux / DALL-E 3 synthesis via
 *      `generateAvatarImage()`.
 *   3. Whenever cloud image keys are unconfigured or transiently unavailable,
 *      synthesize a deterministic, style-aware SVG vector portrait reflecting the
 *      user's chosen aesthetic (`realistic`, `glamour`, `fantasy`, `anime`,
 *      `neon`, `oil-painting`), skin tone, hair color, eye color, and facial hair,
 *      save it under `uploads/avatars/`, and register it in `prisma.photos`
 *      (`metadata: { source: 'ai' }`) so `AvatarGenerationFlow.tsx` never hangs or
 *      drops into an empty catch-all response.
 */
const router = Router();
router.use(authenticate);

const SKIN_PALETTE: Record<string, string> = {
  fair: '#F7DFC6',
  light: '#F1CCA9',
  medium: '#DDA87E',
  olive: '#C9956B',
  tan: '#B57B50',
  brown: '#8D5836',
  dark: '#5C3824',
  deep: '#3F2417',
};

const HAIR_PALETTE: Record<string, string> = {
  black: '#1A181B',
  brown: '#4A2F1D',
  'dark brown': '#362114',
  'light brown': '#734F34',
  blonde: '#E2BA64',
  platinum: '#F1EAD7',
  red: '#9E3321',
  auburn: '#6F281C',
  gray: '#9CA3AF',
  silver: '#CBD5E1',
  blue: '#2563EB',
  pink: '#DB2777',
  purple: '#7C3AED',
};

const EYE_PALETTE: Record<string, string> = {
  brown: '#5B3A29',
  hazel: '#7E6330',
  green: '#2E7D5B',
  blue: '#2563EB',
  gray: '#64748B',
  amber: '#B45309',
};

const STYLE_BACKDROPS: Record<string, { bgA: string; bgB: string; accent: string; label: string }> = {
  realistic: { bgA: '#1E293B', bgB: '#0F172A', accent: '#38BDF8', label: 'Studio Portrait' },
  glamour: { bgA: '#4C1D95', bgB: '#831843', accent: '#F472B6', label: 'Glamour Editorial' },
  fantasy: { bgA: '#064E3B', bgB: '#1E1B4B', accent: '#34D399', label: 'Mythic Aura' },
  anime: { bgA: '#312E81', bgB: '#701A75', accent: '#FBBF24', label: 'Cel Anime' },
  neon: { bgA: '#090D16', bgB: '#3B0764', accent: '#22D3EE', label: 'Neon Cyberpunk' },
  'oil-painting': { bgA: '#451A03', bgB: '#1C1917', accent: '#F59E0B', label: 'Classical Oil' },
};

function pickColor(map: Record<string, string>, raw: unknown, fallback: string): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const key = raw.trim().toLowerCase();
  if (map[key]) return map[key]!;
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return fallback;
}

function escapeXml(input: string): string {
  return input.replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      default: return '&quot;';
    }
  });
}

function buildStylizedAvatarSvg(opts: {
  seed: string;
  style: string;
  displayName: string;
  skinTone?: string | null | undefined;
  hairColor?: string | null | undefined;
  eyeColor?: string | null | undefined;
  facialHair?: string | null | undefined;
  gender?: string | null | undefined;
}): string {
  const theme = STYLE_BACKDROPS[opts.style] || STYLE_BACKDROPS.realistic!;
  const skin = pickColor(SKIN_PALETTE, opts.skinTone, '#DDA87E');
  const hair = pickColor(HAIR_PALETTE, opts.hairColor, '#2B1E19');
  const eyes = pickColor(EYE_PALETTE, opts.eyeColor, '#3B82F6');
  const hasBeard =
    opts.facialHair &&
    !['none', 'clean', 'clean-shaven', 'clean shaven', 'false'].includes(String(opts.facialHair).toLowerCase());
  const longHair = String(opts.gender || '').toLowerCase().includes('female') || opts.style === 'fantasy';
  const hashNum = parseInt(crypto.createHash('sha256').update(opts.seed).digest('hex').slice(0, 6), 16);
  const ringOffset = 18 + (hashNum % 24);
  const safeLabel = escapeXml(theme.label);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgA}" />
      <stop offset="100%" stop-color="${theme.bgB}" />
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.42" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  <circle cx="256" cy="224" r="${168 + (ringOffset % 16)}" fill="url(#halo)" />
  <circle cx="256" cy="224" r="148" fill="none" stroke="${theme.accent}" stroke-opacity="0.35" stroke-width="2.5" />
  ${longHair ? `<path d="M148 210 C140 320, 152 390, 176 420 L336 420 C360 390, 372 320, 364 210 Z" fill="${hair}" />` : ''}
  <!-- Shoulders / Stylized Attire -->
  <path d="M96 512 C108 396, 174 358, 256 358 C338 358, 404 396, 416 512 Z" fill="${theme.accent}" fill-opacity="0.28" />
  <path d="M118 512 C132 414, 186 376, 256 376 C326 376, 380 414, 394 512 Z" fill="#111827" fill-opacity="0.82" />
  <!-- Neck & Face -->
  <rect x="224" y="308" width="64" height="72" rx="26" fill="${skin}" />
  <ellipse cx="256" cy="232" rx="88" ry="104" fill="${skin}" />
  <!-- Hair Crown -->
  <path d="M164 218 C162 132, 212 106, 256 108 C304 106, 350 134, 348 218 C332 178, 300 160, 256 160 C212 160, 180 178, 164 218 Z" fill="${hair}" />
  <!-- Brows & Eyes -->
  <path d="M202 208 Q220 198 238 206" stroke="${hair}" stroke-width="5" stroke-linecap="round" fill="none" />
  <path d="M274 206 Q292 198 310 208" stroke="${hair}" stroke-width="5" stroke-linecap="round" fill="none" />
  <ellipse cx="220" cy="226" rx="14" ry="9" fill="#FFFFFF" />
  <ellipse cx="292" cy="226" rx="14" ry="9" fill="#FFFFFF" />
  <circle cx="220" cy="226" r="6.5" fill="${eyes}" />
  <circle cx="292" cy="226" r="6.5" fill="${eyes}" />
  <circle cx="222" cy="224" r="2.2" fill="#FFFFFF" />
  <circle cx="294" cy="224" r="2.2" fill="#FFFFFF" />
  <!-- Nose & Smile -->
  <path d="M256 232 L250 264 Q256 270 264 264" stroke="#000000" stroke-opacity="0.22" stroke-width="3.5" fill="none" stroke-linecap="round" />
  ${hasBeard ? `<path d="M182 268 C190 326, 224 344, 256 344 C288 344, 322 326, 330 268 C312 288, 286 296, 256 296 C226 296, 200 288, 182 268 Z" fill="${hair}" fill-opacity="0.88" />` : ''}
  <path d="M230 288 Q256 306 282 288" stroke="#9F1239" stroke-width="4.5" fill="none" stroke-linecap="round" />
  <!-- Style Pill -->
  <rect x="156" y="454" width="200" height="32" rx="16" fill="#0F172A" fill-opacity="0.72" stroke="${theme.accent}" stroke-opacity="0.55" />
  <text x="256" y="475" text-anchor="middle" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">${safeLabel}</text>
</svg>`;
}

function hasCloudAvatarProvider(): boolean {
  return Boolean(process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.REPLICATE_API_TOKEN || process.env.OPENAI_API_KEY);
}

async function synthesizeAndStoreLocalAvatar(userId: bigint, style: string, seedExtra = '') {
  const [user, profile] = await Promise.all([
    prisma.users.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.user_profiles.findFirst({ where: { user_id: userId } }),
  ]);

  const svg = buildStylizedAvatarSvg({
    seed: `${userId}-${style}-${Date.now()}-${seedExtra}`,
    style,
    displayName: profile?.display_name || user?.name || 'Member',
    skinTone: profile?.skin_tone,
    hairColor: profile?.hair_color,
    eyeColor: profile?.eye_color,
    facialHair: profile?.facial_hair,
    gender: profile?.gender,
  });

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  const avatarDir = path.join(uploadRoot, 'avatars');
  fs.mkdirSync(avatarDir, { recursive: true });

  const filename = `avatar-${userId}-${Date.now()}.svg`;
  const diskPath = path.join(avatarDir, filename);
  fs.writeFileSync(diskPath, svg, 'utf8');

  const publicUrl = `/uploads/avatars/${filename}`;

  await prisma.user_profiles.updateMany({
    where: { user_id: userId },
    data: {
      avatar_url: publicUrl,
      avatar_status: 'completed',
    },
  });

  const photo = await prisma.photos.create({
    data: {
      user_id: userId,
      filename,
      original_filename: `ai-avatar-${style}.svg`,
      file_path: `avatars/${filename}`,
      mime_type: 'image/svg+xml',
      file_size: Buffer.byteLength(svg, 'utf8'),
      is_primary: false,
      is_private: false,
      metadata: { source: 'ai', provider: 'fwber-studio', style } as any,
    },
  });

  return {
    avatar_url: publicUrl,
    photo_id: Number(photo.id),
    provider: 'fwber-studio',
  };
}

/**
 * GET /api/avatar/providers
 */
router.get('/providers', async (_req: AuthRequest, res: Response) => {
  res.json({
    providers: {
      dalle: { model: 'dall-e-3', available: Boolean(process.env.OPENAI_API_KEY) },
      replicate: { model: 'black-forest-labs/flux-schnell', available: Boolean(process.env.REPLICATE_API_TOKEN) },
      fal: { model: 'fal-ai/flux-pro', available: Boolean(process.env.FAL_KEY || process.env.FAL_API_KEY) },
      local_studio: { model: 'fwber-studio-svg-v2', available: true },
    },
  });
});

/**
 * GET /api/avatar/physical-traits
 */
router.get('/physical-traits', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const [profile, photos] = await Promise.all([
      prisma.user_profiles.findFirst({ where: { user_id: userId } }),
      prisma.photos.findMany({
        where: { user_id: userId },
        orderBy: { is_primary: 'desc' },
        take: 24,
      }),
    ]);

    let age: number | undefined;
    const dob = profile?.date_of_birth || profile?.birthdate;
    if (dob) {
      const computed = Math.floor((Date.now() - new Date(dob as any).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (computed >= 18 && computed <= 120) age = computed;
    }

    let interests: string[] = [];
    if (profile?.interests) {
      try {
        interests = Array.isArray(profile.interests)
          ? (profile.interests as string[])
          : JSON.parse(String(profile.interests));
      } catch {
        interests = [];
      }
    }

    res.json({
      traits: {
        age: age ?? 28,
        gender: profile?.gender || '',
        ethnicity: profile?.ethnicity || '',
        body_type: profile?.body_type || '',
        hair_color: profile?.hair_color || '',
        eye_color: profile?.eye_color || '',
        height_cm: profile?.height_cm ? Number(profile.height_cm) : undefined,
        skin_tone: profile?.skin_tone || '',
        facial_hair: profile?.facial_hair || '',
        breast_size: profile?.breast_size || '',
        fitness_level: profile?.fitness_level || '',
        clothing_style: profile?.clothing_style || '',
        occupation: profile?.occupation || '',
        personality_type: profile?.personality_type || '',
        love_language: profile?.love_language || '',
        relationship_style: profile?.relationship_style || '',
        interests,
      },
      has_photos: photos.length > 0,
      photos: photos.map((p: any) => ({
        id: Number(p.id),
        filename: p.filename,
        file_path: filePathToUrl(p.file_path),
        url: filePathToUrl(p.file_path),
      })),
    });
  } catch (err: any) {
    console.error('[GET /api/avatar/physical-traits]', err.message);
    res.status(500).json({ message: 'Failed to load avatar traits' });
  }
});

/**
 * POST /api/avatar/generate
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const body = req.body || {};
    const style = String(body.style || 'realistic');

    // Sync submitted physical traits onto user_profiles when provided
    const traitUpdates: Record<string, any> = {};
    for (const key of [
      'gender',
      'ethnicity',
      'body_type',
      'hair_color',
      'eye_color',
      'skin_tone',
      'facial_hair',
      'fitness_level',
      'clothing_style',
      'occupation',
      'personality_type',
      'love_language',
      'relationship_style',
    ]) {
      if (typeof body[key] === 'string' && body[key].trim() !== '') {
        traitUpdates[key] = body[key].trim();
      }
    }
    if (body.height_cm !== undefined && body.height_cm !== null && body.height_cm !== '') {
      const h = Number(body.height_cm);
      if (Number.isFinite(h) && h > 0) traitUpdates.height_cm = h;
    }

    const existingProfile = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    if (existingProfile && Object.keys(traitUpdates).length > 0) {
      await prisma.user_profiles.update({
        where: { id: existingProfile.id },
        data: traitUpdates,
      });
    } else if (!existingProfile) {
      await prisma.user_profiles.create({
        data: { user_id: userId, ...traitUpdates },
      });
    }

    // Prefer live cloud synthesis when keys are configured; fall back seamlessly to local SVG studio
    // even if a configured cloud API key is expired, rate-limited, or offline.
    if (hasCloudAvatarProvider()) {
      try {
        const cloudUrl = await generateAvatarImage(userId, style);
        if (typeof cloudUrl === 'string' && cloudUrl.trim().length > 0) {
          const latestPhoto = await prisma.photos.findFirst({
            where: { user_id: userId, file_path: cloudUrl },
            orderBy: { id: 'desc' },
          });
          return res.json({
            avatar_url: cloudUrl,
            photo_id: latestPhoto ? Number(latestPhoto.id) : null,
            status: 'completed',
            style,
          });
        }
      } catch (cloudErr: any) {
        console.warn('[POST /api/avatar/generate] Cloud provider unavailable, using local SVG studio fallback:', cloudErr?.message || cloudErr);
      }
    }

    const local = await synthesizeAndStoreLocalAvatar(userId, style);
    return res.json({
      ...local,
      status: 'completed',
      style,
    });
  } catch (err: any) {
    console.error('[POST /api/avatar/generate]', err.message);
    return res.status(500).json({ message: 'Failed to generate avatar' });
  }
});

/**
 * POST /api/avatar/generate-from-photo
 */
router.post('/generate-from-photo', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const photoId = Number(req.body?.photo_id);
    const style = String(req.body?.style || 'realistic');

    if (!Number.isFinite(photoId) || photoId <= 0) {
      return res.status(400).json({ message: 'Valid photo_id is required' });
    }

    const sourcePhoto = await prisma.photos.findFirst({
      where: { id: BigInt(photoId), user_id: userId },
    });
    if (!sourcePhoto) {
      return res.status(404).json({ message: 'Source photo not found' });
    }

    if (hasCloudAvatarProvider()) {
      try {
        const cloudUrl = await generateAvatarImage(userId, style);
        if (typeof cloudUrl === 'string' && cloudUrl.trim().length > 0) {
          const latestPhoto = await prisma.photos.findFirst({
            where: { user_id: userId, file_path: cloudUrl },
            orderBy: { id: 'desc' },
          });
          return res.json({
            avatar_url: cloudUrl,
            photo_id: latestPhoto ? Number(latestPhoto.id) : null,
            status: 'completed',
            style,
          });
        }
      } catch (cloudErr: any) {
        console.warn('[POST /api/avatar/generate-from-photo] Cloud provider unavailable, using local SVG studio fallback:', cloudErr?.message || cloudErr);
      }
    }

    const local = await synthesizeAndStoreLocalAvatar(userId, style, `photo-${photoId}`);
    return res.json({
      ...local,
      status: 'completed',
      style,
    });
  } catch (err: any) {
    console.error('[POST /api/avatar/generate-from-photo]', err.message);
    return res.status(500).json({ message: 'Failed to generate avatar from photo' });
  }
});

export default router;
