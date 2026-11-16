/**
 * Minimal zero-dependency Sentry reporter for the backend.
 *
 * The frontend uses @sentry/nextjs, but the backend never initialized any
 * Sentry SDK — SENTRY_DSN sat in the env with nothing consuming it. Rather
 * than adding @sentry/node (local registry egress on the dev box cannot
 * fetch it), this speaks the public Sentry envelope protocol directly:
 * parse the DSN, POST a single exception envelope to the ingest endpoint.
 *
 * Contract: reporting must never break the app. Every failure path is
 * swallowed (a console line at most); captureException never throws and
 * never blocks the caller (fire-and-forget with a short timeout).
 */

export interface ParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
  envelopeUrl: string;
}

export function parseSentryDsn(dsn: string | undefined | null): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/\//g, '');
    if (!u.username || !projectId) return null;
    return {
      publicKey: u.username,
      host: u.host,
      projectId,
      envelopeUrl: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

let activeDsn: ParsedDsn | null = null;
let loggedInit = false;

/** Call once at startup. Returns true when a valid DSN armed the reporter. */
export function initSentry(env: NodeJS.ProcessEnv = process.env): boolean {
  activeDsn = parseSentryDsn(env.SENTRY_DSN);
  if (activeDsn && !loggedInit) {
    loggedInit = true;
    console.log(`[sentry] backend reporter armed (project ${activeDsn.projectId})`);
  }
  return activeDsn !== null;
}

export function isSentryArmed(): boolean {
  return activeDsn !== null;
}

/**
 * Report an exception. Fire-and-forget: returns immediately; the HTTP call
 * happens in the background and any failure is logged, never thrown.
 * `fetchFn` is injectable for tests.
 */
export function captureException(
  err: unknown,
  fetchFn: typeof fetch = fetch,
  dsn: ParsedDsn | null = activeDsn,
): void {
  if (!dsn) return;
  try {
    const eventId = [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const message = err instanceof Error ? err.message : String(err);
    const type = err instanceof Error ? err.name : 'Error';
    const now = Date.now() / 1000;
    const envelope =
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn: `https://${dsn.publicKey}@${dsn.host}/${dsn.projectId}` }) + '\n' +
      JSON.stringify({ type: 'event' }) + '\n' +
      JSON.stringify({
        event_id: eventId,
        timestamp: now,
        platform: 'node',
        level: 'error',
        exception: { values: [{ type, value: message }] },
      });
    void Promise.resolve(
      fetchFn(dsn.envelopeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=fwber-backend/1.0, sentry_key=${dsn.publicKey}`,
        },
        body: envelope,
        signal: AbortSignal.timeout(3000),
      }),
    ).catch((e) => console.error('[sentry] report failed:', (e as Error).message));
  } catch (e) {
    console.error('[sentry] report failed:', (e as Error).message);
  }
}
