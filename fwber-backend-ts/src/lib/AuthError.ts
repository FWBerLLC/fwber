/**
 * AuthError — a deliberate authentication failure (bad credentials, unknown
 * account, invalid reset token).
 *
 * WHY: the auth controller previously mapped EVERY non-Zod error to
 * `401 { message: error.message }`, so infrastructure failures (DB hiccups,
 * governance-layer delegation, ledger write problems) surfaced to users as
 * "Invalid credentials" — the root of the transient login-401 confusion.
 * Only errors of this class now become 401; everything else becomes a 500
 * with a generic message (real cause logged server-side).
 */
export class AuthError extends Error {
  /** HTTP status to respond with (always 4xx). */
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
