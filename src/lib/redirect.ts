/**
 * Where a user may be sent after signing in.
 *
 * Only same-site paths are allowed. "//evil.com" and "/\evil.com" are
 * protocol-relative and would bounce the user off the site, and anything
 * containing a scheme is not an internal path at all, so all of those fall
 * back to the default.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/profile'): string {
  if (!raw) return fallback;
  const path = raw.trim();
  if (!path.startsWith('/')) return fallback;
  if (path.startsWith('//') || path.startsWith('/\\')) return fallback;
  if (path.includes('://')) return fallback;
  return path;
}

/** Key used to carry the intended destination across the Google OAuth round-trip. */
export const PENDING_REDIRECT_KEY = 'afb_login_redirect';

/**
 * Reads the destination stashed before the Google sign-in redirect.
 * Returns null when there is nothing usable (or the entry is too old).
 */
export function readPendingRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_REDIRECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { path?: string; at?: number };
    if (!parsed || typeof parsed.path !== 'string') return null;
    // Anything older than 15 minutes is a stale intent, not a live one.
    if (typeof parsed.at === 'number' && Date.now() - parsed.at > 15 * 60 * 1000) return null;
    return safeRedirectPath(parsed.path);
  } catch {
    return null;
  }
}
