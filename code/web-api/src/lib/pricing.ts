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

/**
 * Which source produced the effective price. The storefront needs this to label
 * a discount correctly ("Sale" vs "Campaign") instead of guessing from the numbers.
 */
export type PriceSource = 'base' | 'special' | 'campaign';

export interface VariantPricing {
  /** Listed (struck-through) price. */
  basePrice: number;
  /** What the customer actually pays per unit. */
  effectivePrice: number;
  /** Whole-percent saving vs basePrice, 0 when not discounted. */
  discountPercent: number;
  /** True when effectivePrice < basePrice. */
  onSale: boolean;
  source: PriceSource;
}

/**
 * M-40: the single place that turns (price, specialPrice, campaign%) into everything
 * the UI needs. Serialising this onto every variant keeps the frontend from
 * re-deriving the rule — previously it was reimplemented in four places, unrounded
 * and untested, which is how display and checkout drift apart.
 */
export function computeVariantPricing(
  basePrice: number | string,
  specialPrice?: number | string | null,
  campaignPercent?: number | null,
): VariantPricing {
  const base = round2(Number(basePrice));
  const effective = effectiveUnitPrice(basePrice, specialPrice, campaignPercent);

  let source: PriceSource = 'base';
  if (effective < base) {
    const special = specialPrice == null ? null : Number(specialPrice);
    const specialWins = special != null && Number.isFinite(special) && round2(special) === effective;
    source = specialWins ? 'special' : 'campaign';
  }

  return {
    basePrice: base,
    effectivePrice: effective,
    discountPercent: base > 0 && effective < base ? Math.round((1 - effective / base) * 100) : 0,
    onSale: effective < base,
    source,
  };
}

/**
 * Stamp pricing onto a list of already-serialised variants, in place.
 * Accepts loose records because callers pass Sequelize `toJSON()` output.
 */
export function decorateVariantsPricing(
  variants: Array<Record<string, unknown>> | undefined | null,
  campaignPercent?: number | null,
): void {
  if (!variants?.length) return;
  for (const v of variants) {
    if (v == null || v.price == null) continue;
    Object.assign(
      v,
      computeVariantPricing(v.price as number | string, (v.specialPrice ?? null) as number | string | null, campaignPercent ?? null),
    );
  }
}
