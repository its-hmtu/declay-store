/**
 * M-48: a one-way signal that the admin session is genuinely over.
 *
 * The API client already refreshes an expired admin access token silently, and
 * that path must stay silent — an 8-hour token expiring is normal and the admin
 * should never see it. This event fires only when the REFRESH token is also gone
 * or rejected, i.e. the only remaining option is to sign in again.
 *
 * A module-level emitter rather than React context because the trigger lives in
 * `lib/api.ts`, which is plain TypeScript called from server and client alike and
 * cannot reach into a provider.
 */

const EVENT = 'declay:admin-session-expired';

/** Guards against a burst of parallel 401s producing a stack of dialogs. */
let alreadyNotified = false;

export function notifyAdminSessionExpired(): void {
  if (typeof window === 'undefined') return;
  if (alreadyNotified) return;
  alreadyNotified = true;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onAdminSessionExpired(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Called after a successful sign-in so a later expiry can notify again. */
export function resetAdminSessionExpiry(): void {
  alreadyNotified = false;
}
