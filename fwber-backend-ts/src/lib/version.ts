import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Centralized application version resolver.
 *
 * Per universal version governance (docs/UNIVERSAL_LLM_INSTRUCTIONS.md §4),
 * application surfaces must source their release string from the repository's
 * plain-text VERSION file rather than hardcoding semver strings in route logic.
 *
 * Because PM2, systemd, Jest, and manual CLI invocations may launch the backend
 * with `process.cwd()` set to either `<repo>/fwber-backend-ts` or `<repo>`, we
 * probe relative to both this module's directory (`src/lib` or `dist/lib`) and
 * `process.cwd()`, stripping any accidental UTF-8 BOM (`\uFEFF`) before
 * falling back to `npm_package_version`.
 */
const moduleDir = dirname(fileURLToPath(import.meta.url));

const VERSION_CANDIDATES = [
  resolve(moduleDir, '../../VERSION'),
  resolve(moduleDir, '../../../VERSION'),
  resolve(process.cwd(), 'VERSION'),
  resolve(process.cwd(), '../VERSION'),
];

export function getAppVersion(): string {
  for (const candidate of VERSION_CANDIDATES) {
    try {
      if (!existsSync(candidate)) continue;
      const cleaned = readFileSync(candidate, 'utf8').replace(/^\uFEFF/, '').trim();
      if (cleaned) return cleaned;
    } catch {
      // Try next candidate location
    }
  }
  return process.env.npm_package_version || 'unknown';
}
