/**
 * Generate a fallback avatar URL for users without a profile photo.
 * Uses DiceBear's free API to create consistent, unique avatars based on user identity.
 */

const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

/**
 * Get an avatar URL, falling back to a generated avatar if none is provided.
 * @param avatarUrl - The user's uploaded avatar URL (may be null/undefined)
 * @param seed - A unique identifier for the user (name, id, email, etc.)
 * @returns A valid URL string
 */
// Legacy upload URLs pointing to decommissioned hosts — skip these entirely.
// Covers every retired spelling (api.fwber.me, fwber.me, fwber.site, …) but
// deliberately NOT fwber.online (the live canonical domain).
const DEAD_HOSTS = /https?:\/\/(?:www\.)?(?:api\.)?fwber\.(?:me|site)\//;

export function getAvatarUrl(avatarUrl: string | null | undefined, seed?: string | number): string {
  if (avatarUrl && avatarUrl.trim() !== '' && !DEAD_HOSTS.test(avatarUrl)) {
    return avatarUrl;
  }
  // Generate a deterministic DiceBear avatar from the seed
  const fallbackSeed = seed || 'default';
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(String(fallbackSeed))}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Get initials from a name for text-based fallbacks
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
