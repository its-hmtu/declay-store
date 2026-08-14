import { describe, it, expect } from 'vitest';
import {
  checkCampaignMargins,
  summariseMarginWarnings,
  THIN_MARGIN_THRESHOLD,
  type VariantCost,
} from '@/modules/campaign/campaign.margin';

function variant(over: Partial<VariantCost> = {}): VariantCost {
  return {
    variantId: 1,
    productId: 10,
    productName: 'Dragon figure',
    variantName: 'Standard',
    price: 1000,
    specialPrice: null,
    costPrice: 600,
    ...over,
  };
}

describe('checkCampaignMargins', () => {
  it('flags a discount that sells below cost', () => {
    // 1000 − 50% = 500, cost 600 → losing 100 per unit.
    const [w] = checkCampaignMargins([variant()], 50);
    expect(w.severity).toBe('below-cost');
    expect(w.effectivePrice).toBe(500);
    expect(w.margin).toBe(-100);
  });

  it('flags a surviving but thin margin', () => {
    // 1000 − 35% = 650, cost 600 → 50 profit = 7.7% < 10% threshold.
    const [w] = checkCampaignMargins([variant()], 35);
    expect(w.severity).toBe('thin-margin');
    expect(w.margin).toBe(50);
    expect(w.marginPercent).toBeLessThan(THIN_MARGIN_THRESHOLD);
  });

  it('stays silent on a healthy margin', () => {
    // 1000 − 10% = 900, cost 600 → 33% margin.
    expect(checkCampaignMargins([variant()], 10)).toEqual([]);
  });

  it('accounts for a special price that beats the campaign', () => {
    // Special 550 is cheaper than 1000−20%=800, so the customer pays 550 —
    // and 550 is below the 600 cost. The warning must reflect what is charged.
    const [w] = checkCampaignMargins([variant({ specialPrice: 550 })], 20);
    expect(w.effectivePrice).toBe(550);
    expect(w.severity).toBe('below-cost');
  });

  it('skips variants with no recorded cost — we warn on evidence, not guesses', () => {
    expect(checkCampaignMargins([variant({ costPrice: null })], 90)).toEqual([]);
  });

  it('ignores a zero or nonsense cost', () => {
    expect(checkCampaignMargins([variant({ costPrice: 0 })], 90)).toEqual([]);
    expect(checkCampaignMargins([variant({ costPrice: 'abc' })], 90)).toEqual([]);
  });

  it('sorts worst margin first so losses surface without scrolling', () => {
    const rows = checkCampaignMargins(
      [
        variant({ variantId: 1, price: 1000, costPrice: 650 }), // 700 → +50 (7.1%, thin)
        variant({ variantId: 2, price: 1000, costPrice: 900 }), // 700 → −200 (below cost)
      ],
      30,
    );
    expect(rows.map((r) => r.variantId)).toEqual([2, 1]);
    expect(rows[0].severity).toBe('below-cost');
  });
});

describe('summariseMarginWarnings', () => {
  it('counts each severity and reports the worst margin', () => {
    const warnings = checkCampaignMargins(
      [
        variant({ variantId: 1, costPrice: 900 }), // below cost at 30%
        variant({ variantId: 2, costPrice: 650 }), // thin at 30%
        variant({ variantId: 3, costPrice: 100 }), // healthy
      ],
      30,
    );
    const summary = summariseMarginWarnings(warnings);
    expect(summary.belowCost).toBe(1);
    expect(summary.thinMargin).toBe(1);
    expect(summary.worstMarginPercent).toBeLessThan(0);
  });

  it('handles an empty warning list', () => {
    expect(summariseMarginWarnings([])).toEqual({ belowCost: 0, thinMargin: 0, worstMarginPercent: null });
  });
});
