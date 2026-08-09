/**
 * M-41: margin impact of a campaign, evaluated BEFORE it goes live.
 *
 * The shop already records `cost_price` per variant but never used it defensively —
 * a campaign percent could push a handmade item below what it cost to make, and
 * nothing said a word. Discount codes stack on top of campaign pricing, so the
 * floor can be crossed twice over.
 *
 * Policy (chosen deliberately): WARN, never block. Refusing a customer at checkout
 * because an admin mispriced a campaign punishes the wrong person. The admin sees
 * the damage while creating the campaign, and losses are logged if one slips through.
 *
 * Pure + testable — no DB, no I/O.
 */
import { effectiveUnitPrice } from '@/lib/pricing';

export interface VariantCost {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number | string;
  specialPrice?: number | string | null;
  costPrice?: number | string | null;
}

export type MarginSeverity = 'below-cost' | 'thin-margin';

export interface MarginWarning {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  /** Price the customer would pay under the proposed campaign. */
  effectivePrice: number;
  costPrice: number;
  /** Negative when selling at a loss. */
  margin: number;
  marginPercent: number;
  severity: MarginSeverity;
}

/** Below this margin % we flag the line as thin even though it is still profitable. */
export const THIN_MARGIN_THRESHOLD = 10;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Evaluate a proposed discount percent against a set of variants.
 * Variants without a recorded cost are skipped — we warn on evidence, not guesses.
 */
export function checkCampaignMargins(
  variants: VariantCost[],
  discountPercent: number,
  threshold: number = THIN_MARGIN_THRESHOLD,
): MarginWarning[] {
  const warnings: MarginWarning[] = [];

  for (const v of variants) {
    if (v.costPrice == null) continue;
    const cost = Number(v.costPrice);
    if (!Number.isFinite(cost) || cost <= 0) continue;

    const price = effectiveUnitPrice(v.price, v.specialPrice, discountPercent);
    if (!Number.isFinite(price) || price <= 0) continue;

    const margin = round2(price - cost);
    const marginPercent = Math.round((margin / price) * 1000) / 10;

    if (margin < 0) {
      warnings.push({ ...describe(v), effectivePrice: price, costPrice: cost, margin, marginPercent, severity: 'below-cost' });
    } else if (marginPercent < threshold) {
      warnings.push({ ...describe(v), effectivePrice: price, costPrice: cost, margin, marginPercent, severity: 'thin-margin' });
    }
  }

  // Worst first — the admin should see the loss-makers without scrolling.
  return warnings.sort((a, b) => a.marginPercent - b.marginPercent);
}

function describe(v: VariantCost) {
  return {
    variantId: v.variantId,
    productId: v.productId,
    productName: v.productName,
    variantName: v.variantName,
  };
}

/** Convenience for the admin UI: one line summarising the damage. */
export function summariseMarginWarnings(warnings: MarginWarning[]): {
  belowCost: number;
  thinMargin: number;
  worstMarginPercent: number | null;
} {
  const belowCost = warnings.filter((w) => w.severity === 'below-cost').length;
  return {
    belowCost,
    thinMargin: warnings.filter((w) => w.severity === 'thin-margin').length,
    worstMarginPercent: warnings.length ? warnings[0].marginPercent : null,
  };
}
