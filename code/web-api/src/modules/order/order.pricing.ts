// Pure, dependency-free order pricing & lifecycle logic (extracted for testability).

export type ShippingZone = 'domestic' | 'international';

export function resolveShippingZone(country?: string | null): ShippingZone {
  const c = (country ?? '').trim().toLowerCase();
  if (c === '' || c === 'vn' || c === 'vietnam' || c === 'viet nam' || c === 'việt nam') return 'domestic';
  return 'international';
}

export interface ShippingMethodLike {
  zone: 'all' | 'domestic' | 'international';
  fee: number | string;
  freeOver: number | string | null;
}

export function methodAppliesToZone(methodZone: string, zone: ShippingZone): boolean {
  return methodZone === 'all' || methodZone === zone;
}

/** Shipping fee for a chosen method: free when the free-over threshold is reached. */
export function computeShippingFee(subtotal: number, method: ShippingMethodLike): number {
  const freeOver = method.freeOver != null ? Number(method.freeOver) : null;
  return freeOver != null && subtotal >= freeOver ? 0 : Number(method.fee);
}

/** Final charged total, rounded to 2 decimals: subtotal − discount + shipping. */
export function computeOrderTotal(subtotal: number, discountAmount: number, shippingFee: number): number {
  return Math.round((subtotal - discountAmount + shippingFee) * 100) / 100;
}

const STATUS_RANK: Record<string, number> = {
  pending_payment: 0, paid: 1, processing: 2, shipped: 3, delivered: 4, returned: 5, cancelled: 6,
};

export function isTerminalStatus(status: string): boolean {
  // 'delivered' is terminal for the normal flow; returns go through the dedicated
  // return endpoint (M-06), not the generic status update.
  return status === 'delivered' || status === 'cancelled' || status === 'returned';
}

/** Returns a rejection message if the transition is not allowed, otherwise null (W-21). */
export function statusTransitionError(current: string, next: string): string | null {
  if (isTerminalStatus(current)) {
    return `Order is already ${current} and its status can no longer change.`;
  }
  if (next !== 'cancelled' && STATUS_RANK[next] <= STATUS_RANK[current]) {
    return `Cannot move an order from ${current} back to ${next}.`;
  }
  return null;
}
