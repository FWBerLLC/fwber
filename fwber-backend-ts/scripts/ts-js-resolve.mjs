// ==========================================================================
//  ESM resolve shim for fwber-backend-ts dev on Node >= 24  (v2.3.34)
//
//  Why this exists:
//    The codebase uses TypeScript's "nodenext" import style, where relative
//    imports carry a .js extension even though the source files are .ts
//    (e.g. `import x from './auth.js'` resolves to `./auth.ts`).
//
//    ts-node 10.x used to perform that remap, but on modern Node the native
//    ESM resolver runs first and throws ERR_MODULE_NOT_FOUND before ts-node
//    ever sees the specifier — so `npm run dev` crashed on the very first
//    route import ("Cannot find module '.../routes/email.js'").
//
//    This hook restores the remap with zero new dependencies: when a .js
//    specifier has no real file on disk but a sibling .ts does, we resolve
//    to the .ts file and let ts-node transpile it.
//
//  Load with:  node --import ts-node/esm --import ./scripts/ts-js-resolve.mjs
// ==========================================================================

import { register } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Attempt the classic TypeScript ".js means the .ts/.tsx sibling" resolution.
 * Returns a resolved URL string, or null to fall through to Node's default.
 */
function remapToTypescript(specifier, context) {
  // Only relative/absolute specifiers can point at our own source tree.
  if (!specifier.startsWith('./') && !specifier.startsWith('../') && !specifier.startsWith('file:')) {
    return null;
  }
  // Only handle the TypeScript .js/.jsx/.mjs/.cjs placeholder convention.
  if (!/\.(mjs|cjs|js|jsx)$/.test(specifier)) return null;

  try {
    const parentUrl = context.parentURL ?? pathToFileURL(process.cwd() + '/').href;
    const resolved  = new URL(specifier, parentUrl);
    const asFile    = fileURLToPath(resolved);

    // Real JS file wins — we must not shadow compiled output or node_modules.
    if (existsSync(asFile)) return null;

    for (const ext of ['.ts', '.tsx', '.mts', '.cts']) {
      const candidate = asFile.replace(/\.(mjs|cjs|js|jsx)$/, ext);
      if (existsSync(candidate)) return pathToFileURL(candidate).href;
    }
  } catch {
    // Malformed specifier — let Node produce the authoritative error.
  }
  return null;
}

/**
 * Node module-customization resolve hook.
 * `nextResolve` is the rest of the chain (ts-node's hook, then Node's default).
 */
export async function resolve(specifier, context, nextResolve) {
  const remapped = remapToTypescript(specifier, context);
  if (remapped) {
    return nextResolve(remapped, context);
  }
  return nextResolve(specifier, context);
}

// Self-register when pulled in via `--import`, so callers only need one flag.
register('./ts-js-resolve.mjs', import.meta.url);
