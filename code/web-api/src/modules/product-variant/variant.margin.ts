/**
 * Margin maths for a variant (M-03). Pure + testable.
 * Margin is derived from the price the customer actually pays (effective price)
 * minus the cost price. Admin-only — never expose to staff (BR-09).
 */
export interface MarginResult {
  margin: number;      // absolute profit per unit
  marginPercent: number; // profit as % of the effective price
}

export function computeMargin(
  effectivePrice: number | string,
  costPrice?: number | string | null,
): MarginResult | null {
  if (costPrice == null) return null;
  const price = Number(effectivePrice);
  const cost = Number(costPrice);
  if (!Number.isFinite(price) || !Number.isFinite(cost) || price <= 0) return null;
  const margin = Math.round((price - cost) * 100) / 100;
  const marginPercent = Math.round((margin / price) * 1000) / 10; // one decimal
  return { margin, marginPercent };
}
