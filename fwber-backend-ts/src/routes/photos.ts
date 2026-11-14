import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { filePathToUrl, thumbPathToUrl } from '../lib/photos.js';

const router = Router();

// ─── Config ────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Ensure upload directories exist
for (const dir of [UPLOAD_DIR, THUMB_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Multer Setup ──────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────

const API_BASE = process.env.API_BASE_URL || '';

function serialize(photo: any) {
  return {
    id: String(photo.id),
    url: `${API_BASE}/uploads/${photo.filename}`,
    thumbnail_url: photo.thumbnail_path ? `${API_BASE}/uploads/thumbnails/${path.basename(photo.thumbnail_path)}` : null,
    file_path: filePathToUrl(photo.file_path),
    original_path: photo.original_path,
    filename: photo.filename,
    original_filename: photo.original_filename,
    mime_type: photo.mime_type,
    file_size: photo.file_size,
    width: photo.width,
    height: photo.height,
    is_primary: photo.is_primary,
    is_private: photo.is_private,
    unlock_price: photo.unlock_price ? Number(photo.unlock_price) : null,
    photo_type: photo.photo_type,
    sort_order: photo.sort_order,
    metadata: photo.metadata,
    created_at: photo.created_at,
    updated_at: photo.updated_at,
  };
}

async function generateThumbnail(filePath: string, filename: string): Promise<string> {
  const thumbName = `thumb_${filename}`;
  const thumbPath = path.join(THUMB_DIR, thumbName);
  await sharp(filePath)
    .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);
  return thumbPath;
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width || 0, height: meta.height || 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/photos — List user's photos
router.get('/', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const photos = await prisma.photos.findMany({
      where: { user_id: userId },
      orderBy: { sort_order: 'asc' },
    });
    res.json({ success: true, data: photos.map(serialize), count: photos.length });
  } catch (err) {
    console.error('[photos] GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
});

// Multer failures (wrong field name, oversized/disallowed files) are
// client errors: answer JSON 400 instead of falling through to Express's
// default HTML 500 (prod probe 2026-11-13: field `photos` -> HTML 500).
const uploadSinglePhoto = (req: any, res: Response, next: any) => {
  upload.single('photo')(req, res, (err: any) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large (max 10 MB)'
        : `Invalid upload: ${err.message || 'unexpected file'}`;
      return res.status(400).json({ success: false, message });
    }
    return next();
  });
};

// POST /api/photos — Upload a photo
router.post('/', authenticate, uploadSinglePhoto, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Check photo limit
    const existingCount = await prisma.photos.count({ where: { user_id: userId } });
    if (existingCount >= 12) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      res.status(400).json({ success: false, message: 'Maximum 12 photos allowed' });
      return;
    }

    // Parse form fields
    const isPrivate = req.body.is_private === '1' || req.body.is_private === 'true';
    const unlockPrice = req.body.unlock_price ? parseFloat(req.body.unlock_price) : null;

    // Generate thumbnail
    let thumbnailPath: string | null = null;
    try {
      thumbnailPath = await generateThumbnail(file.path, file.filename);
    } catch (err) {
      console.warn('[photos] Thumbnail generation failed:', err);
    }

    // Get dimensions
    const dims = await getImageDimensions(file.path);

    // Determine sort order (put at end)
    const maxSort = await prisma.photos.findFirst({
      where: { user_id: userId },
      select: { sort_order: true },
      orderBy: { sort_order: 'desc' },
    });
    const sortOrder = (maxSort?.sort_order || 0) + 1;

    // If this is the first photo, make it primary
    const isPrimary = existingCount === 0;

    // Save to DB
    const photo = await prisma.photos.create({
      data: {
        user_id: userId,
        filename: file.filename,
        original_filename: file.originalname,
        file_path: file.path,
        thumbnail_path: thumbnailPath,
        mime_type: file.mimetype,
        file_size: file.size,
        width: dims.width,
        height: dims.height,
        is_primary: isPrimary,
        is_private: isPrivate,
        unlock_price: unlockPrice,
        sort_order: sortOrder,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Sync primary photo to user_profiles.avatar_url
    if (isPrimary) {
      try {
        const avatarUrl = `${API_BASE}/uploads/${file.filename}`;
        await prisma.user_profiles.updateMany({
          where: { user_id: userId },
          data: { avatar_url: avatarUrl, updated_at: new Date() },
        });
      } catch (e) {
        console.warn('[photos] Failed to sync avatar_url:', e);
      }
    }

    res.json({ success: true, data: serialize(photo) });
  } catch (err) {
    console.error('[photos] POST error:', err);
    // Clean up file if DB save failed
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// PUT /api/photos/:id — Update a photo
// PUT /api/photos/reorder — alias for POST
router.put('/reorder', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const { photo_ids, order } = req.body as { photo_ids?: string[]; order?: number[] };
    const ids = photo_ids || order || [];
    if (!Array.isArray(ids)) {
      res.status(400).json({ success: false, message: 'photo_ids or order must be an array' });
      return;
    }
    for (let i = 0; i < ids.length; i++) {
      await prisma.photos.updateMany({
        where: { id: BigInt(ids[i]!), user_id: userId },
        data: { sort_order: i, updated_at: new Date() },
      });
    }
    const photos = await prisma.photos.findMany({
      where: { user_id: userId },
      orderBy: { sort_order: 'asc' },
    });
    res.json({ success: true, data: photos.map(serialize) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Reorder failed' });
  }
});

router.put('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const photoId = BigInt(req.params.id!);

    // Verify ownership
    const photo = await prisma.photos.findFirst({ where: { id: photoId, user_id: userId } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    const updates: any = { updated_at: new Date() };
    if (req.body.is_private !== undefined) {
      updates.is_private = req.body.is_private === '1' || req.body.is_private === true;
    }
    if (req.body.unlock_price !== undefined) {
      updates.unlock_price = parseFloat(req.body.unlock_price) || null;
    }
    if (req.body.photo_type !== undefined) {
      updates.photo_type = req.body.photo_type;
    }
    if (req.body.is_primary !== undefined) {
      // If setting as primary, unset others
      if (req.body.is_primary === true || req.body.is_primary === 'true' || req.body.is_primary === 1) {
        await prisma.photos.updateMany({
          where: { user_id: userId, is_primary: true },
          data: { is_primary: false },
        });
        updates.is_primary = true;
      }
    }

    const updated = await prisma.photos.update({
      where: { id: photoId },
      data: updates,
    });

    res.json({ success: true, data: serialize(updated) });
  } catch (err) {
    console.error('[photos] PUT error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// DELETE /api/photos/:id — Delete a photo
router.delete('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const photoId = BigInt(req.params.id!);

    const photo = await prisma.photos.findFirst({ where: { id: photoId, user_id: userId } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    // Delete files from disk
    if (photo.file_path && fs.existsSync(photo.file_path)) {
      fs.unlinkSync(photo.file_path);
    }
    if (photo.thumbnail_path && fs.existsSync(photo.thumbnail_path)) {
      fs.unlinkSync(photo.thumbnail_path);
    }

    await prisma.photos.delete({ where: { id: photoId } });

    // If the deleted photo was primary, update avatar_url to the next primary (or null)
    if (photo.is_primary) {
      try {
        const nextPrimary = await prisma.photos.findFirst({
          where: { user_id: userId, is_primary: true },
        });
        const avatarUrl = nextPrimary ? `${API_BASE}/uploads/${nextPrimary.filename}` : null;
        await prisma.user_profiles.updateMany({
          where: { user_id: userId },
          data: { avatar_url: avatarUrl, updated_at: new Date() },
        });
      } catch (e) {
        console.warn('[photos] Failed to update avatar_url after delete:', e);
      }
    }

    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    console.error('[photos] DELETE error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// POST /api/photos/reorder — Reorder photos
router.post('/reorder', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const { photo_ids, order } = req.body as { photo_ids?: string[], order?: number[] };
    const ids = photo_ids || order || [];

    if (!Array.isArray(ids)) {
      res.status(400).json({ success: false, message: 'photo_ids must be an array' });
      return;
    }

    for (let i = 0; i < ids.length; i++) {
      await prisma.photos.updateMany({
        where: { id: BigInt(ids[i]!), user_id: userId },
        data: { sort_order: i, updated_at: new Date() },
      });
    }

    const photos = await prisma.photos.findMany({
      where: { user_id: userId },
      orderBy: { sort_order: 'asc' },
    });

    res.json({ success: true, data: photos.map(serialize) });
  } catch (err) {
    console.error('[photos] reorder error:', err);
    res.status(500).json({ success: false, message: 'Reorder failed' });
  }
});

// POST /api/photos/:id/set-primary — Set as primary photo
router.post('/:id/set-primary', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const photoId = BigInt(req.params.id!);

    const photo = await prisma.photos.findFirst({ where: { id: photoId, user_id: userId } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    // Unset all others
    await prisma.photos.updateMany({
      where: { user_id: userId, is_primary: true },
      data: { is_primary: false },
    });

    // Set this one
    await prisma.photos.update({
      where: { id: photoId },
      data: { is_primary: true, updated_at: new Date() },
    });

    // Sync primary photo URL to user_profiles.avatar_url
    try {
      const avatarUrl = `${API_BASE}/uploads/${photo.filename}`;
      await prisma.user_profiles.updateMany({
        where: { user_id: userId },
        data: { avatar_url: avatarUrl, updated_at: new Date() },
      });
    } catch (e) {
      console.warn('[photos] Failed to sync avatar_url on set-primary:', e);
    }

    const photos = await prisma.photos.findMany({
      where: { user_id: userId },
      orderBy: { sort_order: 'asc' },
    });

    res.json({ success: true, data: photos.map(serialize) });
  } catch (err) {
    console.error('[photos] set-primary error:', err);
    res.status(500).json({ success: false, message: 'Failed to set primary photo' });
  }
});

// GET /api/photos/settings — Get upload settings
router.get('/settings', authenticate, async (_req: any, res: Response) => {
  res.json({
    success: true,
    data: {
      max_photos: 12,
      max_file_size: MAX_FILE_SIZE,
      allowed_formats: ALLOWED_MIMES,
      auto_blur: false,
      reveal_price: 10,
    },
  });
});

// POST /api/photos/:id/reveal — Request photo reveal
router.post('/:id/reveal', authenticate, async (req: any, res: Response) => {
  res.json({ success: true, status: 'requested' });
});

// POST /api/photos/:id/unlock — Unlock a private photo
router.post('/:id/unlock', authenticate, async (req: any, res: Response) => {
  res.json({ success: true, message: 'Unlocked', balance: 0 });
});

// GET /api/photos/:id/original — Get original photo
router.get('/:id/original', authenticate, async (req: any, res: Response) => {
  try {
    const userId = BigInt(req.user.id);
    const photoId = BigInt(req.params.id!);
    const photo = await prisma.photos.findFirst({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    // Only owner or someone who unlocked can see original
    if (photo.user_id !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    res.json({ success: true, url: `/uploads/${photo.filename}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

// GET /api/photos/reveals — List photo reveal requests
router.get('/reveals', authenticate, async (_req: any, res: Response) => {
  res.json({ success: true, data: [], count: 0 });
});




export default router;
