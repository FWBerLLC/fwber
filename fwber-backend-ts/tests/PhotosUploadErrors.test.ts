import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Upload error contract: multipart mistakes (wrong field name, oversized
// or disallowed files) are client errors and must come back as JSON 400s,
// not Express's default HTML 500. Prod probe 2026-11-13: POST /api/photos
// with field `photos` (plural) returned MulterError -> HTML 500, while the
// correct `photo` field succeeds. These tests pin the JSON contract.

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    photos: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
  },
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 197 };
    next();
  },
}));

const { default: photosRoutes } = await import('../src/routes/photos.js');

function buildApp() {
  const app = express();
  app.use('/api/photos', photosRoutes);
  return app;
}

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

describe('POST /api/photos upload error contract', () => {
  it('returns JSON 400 (not HTML 500) for an unexpected file field', async () => {
    const res = await request(buildApp())
      .post('/api/photos')
      .attach('photos', PIXEL, 'pixel.png');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.success).toBe(false);
  });

  it('returns JSON 400 for a disallowed file type', async () => {
    const res = await request(buildApp())
      .post('/api/photos')
      .attach('photo', Buffer.from('not an image'), 'notes.txt');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.success).toBe(false);
  });

  it('returns JSON 400 when no file is attached at all', async () => {
    const res = await request(buildApp()).post('/api/photos');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
