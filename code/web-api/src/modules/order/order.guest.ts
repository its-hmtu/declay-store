import { randomBytes } from 'node:crypto';

/**
 * Guest checkout helpers (M-01). Pure + testable.
 * A guest order has no user account, so it must carry its own contact details and
 * a lookup token the buyer can use to track the order without signing in.
 */
export interface GuestContact {
  name: string;
  email: string;
  phone: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{8,20}$/;

/** Trim + validate guest contact details. Returns null when invalid/incomplete. */
export function normalizeGuestContact(input?: Partial<GuestContact> | null): GuestContact | null {
  const name = (input?.name ?? '').trim();
  const email = (input?.email ?? '').trim().toLowerCase();
  const phone = (input?.phone ?? '').trim();
  if (name.length < 2 || name.length > 120) return null;
  if (!EMAIL_RE.test(email) || email.length > 160) return null;
  if (!PHONE_RE.test(phone)) return null;
  return { name, email, phone };
}

/** Opaque token so a guest can look up their own order (never guessable). */
export function generateGuestToken(): string {
  return randomBytes(24).toString('hex'); // 48 chars
}
