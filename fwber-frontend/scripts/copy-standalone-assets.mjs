#!/usr/bin/env node
/**
 * Copy .next/static and public/ into the standalone output directory.
 * Next.js standalone builds do NOT include these automatically.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = join(root, '.next', 'standalone');
const appName = 'fwber-frontend';
const standaloneApp = join(standalone, appName);

if (!existsSync(standaloneApp)) {
  console.log('No standalone output found — skipping asset copy.');
  process.exit(0);
}

// Copy .next/static → standalone/.next/static
const staticSrc = join(root, '.next', 'static');
const staticDest = join(standaloneApp, '.next', 'static');
if (existsSync(staticSrc)) {
  mkdirSync(staticDest, { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log(`Copied .next/static → ${staticDest}`);
}

// Copy public/ → standalone/public/
const publicSrc = join(root, 'public');
const publicDest = join(standaloneApp, 'public');
if (existsSync(publicSrc)) {
  mkdirSync(publicDest, { recursive: true });
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log(`Copied public/ → ${publicDest}`);
}

console.log('Standalone assets ready.');
