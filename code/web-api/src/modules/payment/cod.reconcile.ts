/**
 * COD reconciliation rules (M-07 / BR-11). Pure + testable.
 * Cash is only "settled" once the amount handed over by the carrier is checked
 * against the order total; any difference must be recorded, not silently accepted.
 */
export type ReconcileOutcome = 'matched' | 'short' | 'over';

export interface ReconcileResult {
  outcome: ReconcileOutcome;
  difference: number; // collected − expected, rounded to cents
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compare collected cash with the expected total (1 cent tolerance for rounding). */
export function reconcileCod(expected: number | string, collected: number | string): ReconcileResult {
  const diff = round2(Number(collected) - Number(expected));
  if (Math.abs(diff) <= 0.01) return { outcome: 'matched', difference: 0 };
  return { outcome: diff < 0 ? 'short' : 'over', difference: diff };
}

/** A COD order is eligible for reconciliation only once it has been delivered. */
export function canReconcile(orderStatus: string, alreadyReconciled: boolean): string | null {
  if (alreadyReconciled) return 'This payment has already been reconciled.';
  if (orderStatus !== 'delivered' && orderStatus !== 'returned') {
    return `Cash can only be reconciled after delivery (current status: ${orderStatus}).`;
  }
  return null;
}
