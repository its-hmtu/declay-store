/**
 * Return window rules (M-06 / BR-06). Pure + testable.
 * A delivered order may be returned within RETURN_WINDOW_DAYS of delivery.
 */
export const RETURN_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function returnDeadline(deliveredAt: Date, windowDays = RETURN_WINDOW_DAYS): Date {
  return new Date(deliveredAt.getTime() + windowDays * DAY_MS);
}

/**
 * Why a return is not allowed, or null when it is. Keeping the reason as a message
 * lets the API answer with something the shop staff can act on.
 */
export function returnRejectionReason(
  status: string,
  deliveredAt: Date | null | undefined,
  now: Date = new Date(),
  windowDays = RETURN_WINDOW_DAYS,
): string | null {
  if (status === 'returned') return 'This order has already been returned.';
  if (status !== 'delivered') return `Only delivered orders can be returned (current status: ${status}).`;
  if (!deliveredAt) return 'This order has no delivery date recorded.';
  if (now.getTime() > returnDeadline(deliveredAt, windowDays).getTime()) {
    return `The ${windowDays}-day return window closed on ${returnDeadline(deliveredAt, windowDays).toISOString().slice(0, 10)}.`;
  }
  return null;
}

export function canReturn(
  status: string,
  deliveredAt: Date | null | undefined,
  now: Date = new Date(),
  windowDays = RETURN_WINDOW_DAYS,
): boolean {
  return returnRejectionReason(status, deliveredAt, now, windowDays) === null;
}
