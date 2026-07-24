// Shared, dependency-free product pricing. Single source of truth for the
// "effective" unit price so display, cart and checkout never disagree.

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Effective unit price = the best (lowest) valid price for the customer.
 * Increment 1: base price, or a valid special price when it is cheaper.
 * (Campaign discounts extend this in increment 2.)
 */
export function effectiveUnitPrice(
  basePrice: number | string,
  specialPrice?: number | string | null,
  campaignPercent?: number | null,
): number {
  const base = Number(basePrice);
  let best = base;
  if (specialPrice != null) {
    const special = Number(specialPrice);
    if (Number.isFinite(special) && special >= 0 && special < best) best = special;
  }
  if (campaignPercent != null) {
    const pct = Number(campaignPercent);
    if (Number.isFinite(pct) && pct > 0 && pct <= 100) {
      const campaignPrice = base * (1 - pct / 100);
      if (campaignPrice < best) best = campaignPrice;
    }
  }
  return round2(best);
}
