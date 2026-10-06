import path from 'path';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

/** Base URL for serving uploaded files (e.g. https://api.fwber.site) */
const API_BASE = process.env.API_BASE_URL || '';

/**
 * Convert a filesystem path stored in the database to a full URL
 * suitable for returning in API responses.
 *
 * e.g. "/var/www/fwber/repo/fwber-backend-ts/uploads/1777435104230-hdia7o.jpg"
 *   → "https://api.fwber.site/uploads/1777435104230-hdia7o.jpg"
 *
 * If the path is already a relative URL (starts with "/uploads"), prepend API_BASE.
 * If empty/null, return empty string.
 */
export function filePathToUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';

  // Already a full URL (http:// or https://) — return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  let relativePath: string;

  // Already a relative URL path (e.g. "/uploads/...")
  if (filePath.startsWith('/uploads')) {
    relativePath = filePath;
  } else {
    // Absolute filesystem path — extract the filename
    const filename = path.basename(filePath);
    relativePath = `/uploads/${filename}`;
  }

  // Prepend API base URL if configured
  if (API_BASE) {
    return `${API_BASE}${relativePath}`;
  }
  return relativePath;
}

/**
 * Convert a thumbnail filesystem path to a URL path.
 */
export function thumbPathToUrl(thumbPath: string | null | undefined): string | null {
  if (!thumbPath) return null;

  let relativePath: string;
  if (thumbPath.startsWith('/uploads')) {
    relativePath = thumbPath;
  } else {
    const filename = path.basename(thumbPath);
    relativePath = `/uploads/thumbnails/${filename}`;
  }

  if (API_BASE) {
    return `${API_BASE}${relativePath}`;
  }
  return relativePath;
}
