/**
 * Missing-upload placeholder image (256x256 PNG).
 *
 * WHY: the production uploads directory lost files (see TODO.md "Photo
 * Migration"). Historical DB rows still reference /uploads/<file> URLs whose
 * files no longer exist. When the backend served these via express.static the
 * request fell through to a JSON catch-all (HTTP 200 `[]`) or 404, which made
 * the Next.js `/_next/image` optimizer return 500s for every dead image and
 * surfaced broken-image UI across the app.
 *
 * WHAT: a neutral gray "camera glyph" image served with HTTP 200 for any
 * missing image file under /uploads/. This guarantees:
 *   - the Next.js image optimizer always receives a valid image (no 500s)
 *   - `<img onError>` fallbacks are not relied upon (they are flaky through
 *     the optimizer chain  -  see HANDOFF/2026-10-16 notes)
 *   - if a backup restore ever returns the real files, the static handler
 *     takes precedence again and real images resume with no code change
 *
 * The buffer is embedded (not a file asset) so it works identically for
 * ts-node dev (`src/`) and compiled (`dist/`) module resolution.
 */
export const MISSING_UPLOAD_PNG: Buffer = Buffer.from(
  `iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADjUlEQVR42u3dvW3DMBCAUe8/Q7oM
kFlcpEp9cJElnA0iUfw56h7w1UbA44sAi5Ye8fqVyvawBAJAAkACQAJAAkACQAJAAkACQAJAAkAC
QAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJA
AkACQAJAAkACQAJAAkACQAJAAkACQABYBQEgASABIAEgASABIAEgASABIAEgASABIAEgASABIAEg
ASABIAEgASABIAEgASABIAEgASABIAEgASABIAEgASABsE0fn19Ds8IAACAAABAAAAgAAAQAAAIg
J4A8nyYAABAAAAgAAAQAAABYBQAAEAAACAAA3JBSpRtwAAgAAAQAAAIAAAEAgADwdaQvcwEwQgAA
MEIAADBCAAAwQgAAMEIAADDCjn+n1QOgxAg3+t4dAACy3JIDAIBdR7jvjVgAAEh3FgMAAPYY4Q3O
5AAAQN5DeAAAkHSEDbv5+f2T0AAAAAzZ/X/b/UjLDQAAQOfdf3Drn2IAAAApRth96x9nAAAAi0c4
dPevMgAAAB0AdNn9/xoAAIBlI5yz++cbAACAXLt/sgEAAGgHcHZPdzEAAABTR3hl91+8dEwwAAAA
QwAcvz0MAAD7Aeiy+5s/CgAAJo2wYde2HRNadREAAICe//6bD36uuggAAAAAAADQA8DF0/8AAAAA
AAAAAAAAAAAAwOIRztz9qwwAAIArAAAAAAAAAAAAAAAAAADgTjAAAAAAAABOgwLg9wB+DwAAAH4R
BgAAfhMMQDEA4akQAADguUAA1AUQngwHQHEA4dmgAADg6dAA1AUQ3g8AQHEA4Q0xABQHEN4RBkBx
AOEtkQAUBxDeEwxAcQDhTfEAFAcwiEGp1QPgDiPcdPcDAEAiBsVXD4D7jDD/vgcAgAV/p9UDwAit
HgBGaPUAMEKrB4ARWj0AjNDqAZD5TE6pAAAAAAAAAAAAAAAAAAAAAAAAAAAkACQAJAAkACQAJAAk
ACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQA
JAAkACQABIAEgASABIAEgASABIAEgASABIAEgASABIAEgASABIAEgASABIAEgASABIAEgASABIAE
gASABIAEgASABIAEgASABIAEgASABIAEgASABIAEgHS6N7Sf+hYtfq1dAAAAAElFTkSuQmCC`,
  'base64'
);

/** Image extensions that should receive the placeholder instead of a 404. */
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i;

/**
 * Decide whether a missing /uploads/ request should get the placeholder.
 * Non-image files (audio intros, etc.) are NOT placeholder-served  -  a 200 PNG
 * response for an .mp3 would break audio players worse than a clean 404.
 */
export function shouldServeUploadPlaceholder(filePath: string): boolean {
  return IMAGE_EXT.test(filePath);
}
