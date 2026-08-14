/**
 * Cart ownership (M-01). A cart belongs either to a logged-in user or to an
 * anonymous guest session, never both. Pure + testable: no I/O.
 */
export type CartOwner = { userId: number } | { sessionId: string };

export function isUserOwner(owner: CartOwner): owner is { userId: number } {
  return 'userId' in owner;
}

/** Sequelize `where` clause for the owner. */
export function ownerWhere(owner: CartOwner): { userId: number } | { sessionId: string } {
  return isUserOwner(owner) ? { userId: owner.userId } : { sessionId: owner.sessionId };
}

/**
 * Resolve the cart owner from request context. A valid user token wins; otherwise
 * the guest session id is used. Returns null when neither is present.
 */
export function resolveCartOwner(userId?: number | null, sessionId?: string | null): CartOwner | null {
  if (userId) return { userId };
  const sid = (sessionId ?? '').trim();
  if (sid.length >= 8 && sid.length <= 64) return { sessionId: sid };
  return null;
}
