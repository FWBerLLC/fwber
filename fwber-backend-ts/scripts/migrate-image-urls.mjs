/**
 * migrate-image-urls.mjs  (fwber v2.3.37)
 *
 * WHAT: One-shot (idempotent, re-runnable) database migration that repairs
 * legacy upload URLs left behind by the fwber.me -> fwber.site -> fwber.online
 * domain migrations, and clears avatar references whose files were lost in the
 * production uploads-directory incident (TODO.md "Photo Migration").
 *
 * WHY: DB rows still referenced `https://api.fwber.me/uploads/...` (and other
 * legacy host spellings). Those hosts are dead (fwber.me is NXDOMAIN as of
 * 2026-10-22), so every affected image 500'd through the Next.js image
 * optimizer. The canonical upload host is `https://api.fwber.online/uploads/`
 * (matches `API_BASE_URL` in production .env and next.config.js remotePatterns).
 *
 * RULES (applied only to upload-media columns; external URLs are never touched):
 *   1. Any fwber-hosted upload URL, on any legacy spelling, in either
 *      `/uploads/x` or `/api/uploads/x` form, or as a relative `/uploads/x`
 *      path, is normalized to `https://api.fwber.online/uploads/x`.
 *      - Filenames are preserved verbatim: if a backup restore ever returns
 *        the files, images resume working with no further migration.
 *   2. AVATAR columns additionally get rows NULLED when the target file is
 *      missing on disk. Rationale: `UserAvatar` renders a deterministic
 *      DiceBear avatar for null URLs (good UX), whereas a canonical URL to a
 *      missing file renders a gray placeholder box (bad UX for a face).
 *      Every nulled value is journaled to
 *      `fwber-backend-ts/image-url-migration-journal.json` so nothing is
 *      actually lost, and any restore can re-point avatars from the journal.
 *   3. Media columns (photos, chat media, scrapbook, merchant images) KEEP
 *      their canonicalized URLs even when the file is missing, because the
 *      backend now serves a placeholder image for missing uploads
 *      (src/lib/missingUploadPlaceholder.ts) and the reference stays valid
 *      for backup restore.
 *
 * USAGE:
 *   node scripts/migrate-image-urls.mjs            # dry run (prints report)
 *   node scripts/migrate-image-urls.mjs --apply    # perform updates
 *
 * Run from the fwber-backend-ts directory on the machine with DB access
 * (production: on the Hetzner host, DATABASE_URL points at 127.0.0.1:3306).
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient();

// Same resolution rule the backend uses in src/index.ts.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const JOURNAL_PATH = path.resolve('image-url-migration-journal.json');

/** Canonical base for every uploaded file (matches production API_BASE_URL). */
const CANONICAL_UPLOAD_BASE = 'https://api.fwber.online/uploads/';

/**
 * Media-bearing columns to normalize. Only values matching a fwber upload URL
 * (or a relative /uploads/ path) are ever modified; third-party URLs such as
 * Stripe redirects or webhooks are intentionally NOT in this list.
 */
const MEDIA_COLUMNS = [
  ['messages', 'media_url'],
  ['messages', 'thumbnail_url'],
  ['group_messages', 'media_url'],
  ['group_messages', 'thumbnail_url'],
  ['scrapbook_entries', 'media_url'],
  ['merchant_inventories', 'image_url'],
  ['gifts', 'icon_url'],
  ['groups', 'icon'],
  ['achievements', 'icon'],
  ['user_profiles', 'voice_intro_url'],
];

/**
 * Avatar columns. Same normalization, plus NULL-out when the file is missing
 * so the UI falls back to generated avatars instead of placeholder boxes.
 */
const AVATAR_COLUMNS = [
  ['users', 'avatar_url'],
  ['user_profiles', 'avatar_url'],
  ['user_physical_profiles', 'avatar_image_url'],
  ['attendees', 'avatar_url'],
];

/**
 * Normalize a legacy upload URL to the canonical host.
 * Returns the original string when the value is external / non-upload.
 */
function canonicalizeUploadUrl(value) {
  if (typeof value !== 'string' || value === '') return value;

  // Absolute URL on any fwber host spelling, with optional /api/ prefix.
  // e.g. https://api.fwber.me/uploads/x.png   -> uploads/x.png
  //      https://fwber.me/api/uploads/x.png   -> uploads/x.png
  //      https://fwber.online/api/uploads/x.png -> uploads/x.png
  const abs = value.match(
    /^https?:\/\/(?:www\.)?(?:api\.)?fwber\.(?:me|site|online)\/(?:api\/)?uploads\/(.+)$/i
  );
  if (abs) return `${CANONICAL_UPLOAD_BASE}${abs[1]}`;

  // Relative form produced when API_BASE_URL was unset.
  if (value.startsWith('/uploads/')) {
    return `${CANONICAL_UPLOAD_BASE}${value.slice('/uploads/'.length)}`;
  }

  return value;
}

/** Extract the on-disk relative path for a canonical upload URL, or null. */
function uploadRelPath(value) {
  const m = value.match(/^https:\/\/api\.fwber\.online\/uploads\/(.+)$/i);
  return m ? m[1] : null;
}

/** Whether the upload file backing a canonical URL exists on disk. */
function uploadFileExists(value) {
  const rel = uploadRelPath(value);
  if (!rel) return true; // not an upload URL we manage - treat as "exists"
  // Guard against path traversal in stored data before touching the FS.
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) return true;
  return fs.existsSync(abs);
}

async function processColumns(columns, { nullWhenFileMissing }) {
  const journalEntries = [];
  const stats = [];

  for (const [table, column] of columns) {
    // Column/table names come from the constant lists above (never user input).
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, \`${column}\` AS v FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` <> ''`
    );

    let normalized = 0;
    let nulled = 0;

    for (const row of rows) {
      const before = row.v;
      const after = canonicalizeUploadUrl(before);
      if (after === before) continue; // external or already canonical

      if (nullWhenFileMissing && uploadFileExists(after) === false) {
        if (APPLY) {
          await prisma.$executeRawUnsafe(
            `UPDATE \`${table}\` SET \`${column}\` = NULL WHERE id = ?`,
            row.id
          );
        }
        nulled++;
        journalEntries.push({
          table,
          column,
          id: String(row.id),
          action: 'null-file-missing',
          before,
          canonicalIfRestored: after,
        });
        continue;
      }

      if (APPLY) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`,
          after,
          row.id
        );
      }
      normalized++;
      journalEntries.push({
        table,
        column,
        id: String(row.id),
        action: 'canonicalized',
        before,
        after,
      });
    }

    if (normalized || nulled) {
      stats.push({ table, column, normalized, nulled, scanned: rows.length });
    }
  }

  return { stats, journalEntries };
}

async function main() {
  console.log(`migrate-image-urls: ${APPLY ? 'APPLY' : 'DRY-RUN'} mode`);
  console.log(`upload dir: ${UPLOAD_DIR} (exists: ${fs.existsSync(UPLOAD_DIR)})`);

  const media = await processColumns(MEDIA_COLUMNS, { nullWhenFileMissing: false });
  const avatars = await processColumns(AVATAR_COLUMNS, { nullWhenFileMissing: true });

  const stats = [...media.stats, ...avatars.stats];
  const journalEntries = [...media.journalEntries, ...avatars.journalEntries];

  console.log('\nPer-column results:');
  for (const s of stats) {
    console.log(
      `  ${s.table}.${s.column}: scanned=${s.scanned} canonicalized=${s.normalized} nulled=${s.nulled}`
    );
  }
  if (!stats.length) console.log('  (nothing to do - all values clean)');

  const totalNorm = stats.reduce((a, s) => a + s.normalized, 0);
  const totalNull = stats.reduce((a, s) => a + s.nulled, 0);
  console.log(`\nTOTAL canonicalized=${totalNorm} nulled=${totalNull}`);

  // Journal every touched row so no reference is ever silently lost.
  const journal = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    uploadDir: UPLOAD_DIR,
    totals: { canonicalized: totalNorm, nulled: totalNull },
    entries: journalEntries,
  };
  fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2));
  console.log(`journal written: ${JOURNAL_PATH} (${journalEntries.length} entries)`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to perform updates.');
  }
}

main()
  .catch((err) => {
    console.error('migrate-image-urls failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
