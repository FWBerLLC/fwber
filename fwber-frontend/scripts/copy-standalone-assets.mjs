#!/usr/bin/env node
/**
 * Copy .next/static and public/ into the standalone output directory.
 * Next.js standalone builds do NOT include these automatically.
 *
 * Uses `verbatimSymlinks: true` when copying `public/` so production symlinks
 * (such as `public/uploads -> ../../fwber-backend-ts/uploads`) remain lightweight
 * symlinks rather than duplicating uploaded media on every deploy.
 */
import { cpSync, existsSync, lstatSync, mkdirSync, symlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDirName = process.env.NEXT_DIST_DIR || '.next';
const standalone = join(root, distDirName, 'standalone');
const appName = 'fwber-frontend';
const standaloneApp = join(standalone, appName);

if (!existsSync(standaloneApp)) {
  console.log(`No standalone output found at ${standaloneApp} — skipping asset copy.`);
  process.exit(0);
}

// Copy .next/static → standalone/.next/static
const staticSrc = join(root, distDirName, 'static');
const staticDest = join(standaloneApp, distDirName, 'static');
if (existsSync(staticSrc)) {
  mkdirSync(staticDest, { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log(`Copied ${distDirName}/static → ${staticDest}`);
}

// Copy public/ → standalone/public/ (preserving symlinks)
const publicSrc = join(root, 'public');
const publicDest = join(standaloneApp, 'public');
if (existsSync(publicSrc)) {
  mkdirSync(publicDest, { recursive: true });
  cpSync(publicSrc, publicDest, { recursive: true, verbatimSymlinks: true });
  console.log(`Copied public/ → ${publicDest}`);
}

// Ensure standalone/public/uploads points to ../fwber-backend-ts/uploads if present
const backendUploads = resolve(root, '..', 'fwber-backend-ts', 'uploads');
const standaloneUploads = join(publicDest, 'uploads');
try {
  lstatSync(standaloneUploads);
} catch {
  if (existsSync(backendUploads)) {
    mkdirSync(publicDest, { recursive: true });
    symlinkSync(backendUploads, standaloneUploads, 'junction');
    console.log(`Linked standalone uploads → ${backendUploads}`);
  }
}

console.log('Standalone assets ready.');
