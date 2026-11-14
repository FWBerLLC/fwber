/**
 * Internet Vulnerability Scanner & Probe Path Guard (`v2.3.89`)
 *
 * WHY THIS EXISTS:
 * `fwber-backend-ts/src/index.ts` ends with a permissive `app.use('/api', ...)`
 * fallback that returns `200 []` (GET) or `200 { success: true }` (mutations)
 * so early/experimental frontend feature widgets never crash on HTML 404 pages.
 *
 * However, live Hetzner production PM2 logs (`fwber-backend-ts-out.log`) revealed
 * automated internet vulnerability scanners hitting unmatched paths such as:
 *   - `GET /api/v1/namespaces/default/secrets` -> `200 []`
 *   - `GET /api/v3/.env` -> `200 []`
 *
 * Returning HTTP 200 with valid JSON to Kubernetes secret dumps, `.env` dotfiles,
 * SQL backups, and CMS exploit probes causes automated scanner engines to flag
 * the host as a false-positive hit and launch aggressive follow-up fuzzing waves.
 *
 * Because this helper is evaluated ONLY inside the terminal `app.use('/api', ...)`
 * catch-all (after all 75+ mounted Express routers have declined to match),
 * returning `404` for known probe patterns cannot break any mounted API route
 * while cleanly terminating scanner storms.
 */

const DOTFILE_SEGMENT_PATTERN = /(?:^|\/)\.(?!well-known(?:\/|$))[a-z0-9_-]+/i;

const SENSITIVE_EXTENSION_PATTERN =
  /\.(?:env|git|sql|bak|old|orig|swp|ini|php\d?|phtml|asp|aspx|jsp|cgi|conf|cfg|ya?ml|toml|pem|key|crt|p12|pfx|tfstate|sqlite\d?|db|log|sh|bash|ps1|py|rb)(?:$|[/?#])/i;

const EXPLOIT_PROBE_SEGMENT_PATTERN =
  /(?:^|\/)(?:v\d+\/(?:namespaces|pods|nodes|secrets|configmaps|serviceaccounts|containers|users|tokens)|wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|myadmin|actuator|jolokia|solr|jmx-console|web-console|invoker|vendor\/phpunit|_ignition|_profiler|debug\/default|cgi-bin|server-status|server-info|ecp|owa|autodiscover|boaform|hnap1|sdk|evox)(?:$|\/|[?#])/i;

/**
 * Determine whether an unmatched `/api/*` sub-path (`req.path` or `req.url`
 * stripped of `/api`) matches an automated scanner or credential-harvesting probe.
 */
export function isScannerProbePath(rawPath: string): boolean {
  if (!rawPath) return false;

  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // Malformed percent-encoding in an unmatched API path (e.g. `%c0%ae`) is
    // itself a directory-traversal probe signature.
    return true;
  }

  // Strip query string before structural checks while keeping extension checks aware.
  const withoutQuery = decoded.split('?')[0] ?? '';
  const pathOnly = withoutQuery.split('#')[0] ?? '';

  // Directory traversal attempts (`..` segments or null bytes)
  if (pathOnly.includes('..') || pathOnly.includes('\0') || pathOnly.includes('\\')) {
    return true;
  }

  if (DOTFILE_SEGMENT_PATTERN.test(pathOnly)) {
    return true;
  }

  if (SENSITIVE_EXTENSION_PATTERN.test(decoded)) {
    return true;
  }

  if (EXPLOIT_PROBE_SEGMENT_PATTERN.test(pathOnly)) {
    return true;
  }

  return false;
}
