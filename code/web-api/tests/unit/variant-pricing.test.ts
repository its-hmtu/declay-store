import { describe, it, expect } from 'vitest';
import { computeVariantPricing, decorateVariantsPricing } from '@/lib/pricing';

describe('computeVariantPricing', () => {
  it('reports no discount on a plain base price', () => {
    expect(computeVariantPricing(1000)).toEqual({
      basePrice: 1000,
      effectivePrice: 1000,
      discountPercent: 0,
      onSale: false,
      source: 'base',
    });
  });

  it('labels a special price as the source', () => {
    const p = computeVariantPricing(1000, 700);
    expect(p.effectivePrice).toBe(700);
    expect(p.discountPercent).toBe(30);
    expect(p.source).toBe('special');
  });

  it('labels a campaign as the source when it wins', () => {
    const p = computeVariantPricing(1000, 900, 20); // campaign 800 < special 900
    expect(p.effectivePrice).toBe(800);
    expect(p.source).toBe('campaign');
  });

  it('credits the special price when it beats the campaign', () => {
    // The UI must not call this a campaign discount — the campaign did not set it.
    const p = computeVariantPricing(1000, 700, 20); // campaign 800 > special 700
    expect(p.effectivePrice).toBe(700);
    expect(p.source).toBe('special');
  });

  it('ignores an out-of-range campaign percent', () => {
    expect(computeVariantPricing(1000, null, 0).onSale).toBe(false);
    expect(computeVariantPricing(1000, null, 150).onSale).toBe(false);
    expect(computeVariantPricing(1000, null, -10).onSale).toBe(false);
  });

  it('accepts string prices from the database layer', () => {
    const p = computeVariantPricing('1000.00', '750.50');
    expect(p.effectivePrice).toBe(750.5);
    expect(p.basePrice).toBe(1000);
  });

  it('rounds to two decimals like the order total does', () => {
    // 999 − 33% = 669.33 exactly; guards against float dust reaching the invoice.
    expect(computeVariantPricing(999, null, 33).effectivePrice).toBe(669.33);
  });

  it('handles a 100% campaign without going negative', () => {
    const p = computeVariantPricing(1000, null, 100);
    expect(p.effectivePrice).toBe(0);
    expect(p.discountPercent).toBe(100);
  });
});

describe('decorateVariantsPricing', () => {
  it('stamps pricing onto every variant in place', () => {
    const variants: Array<Record<string, unknown>> = [
      { id: 1, price: '1000', specialPrice: null },
      { id: 2, price: '2000', specialPrice: '1500' },
    ];
    decorateVariantsPricing(variants, 10);

    expect(variants[0].effectivePrice).toBe(900);
    expect(variants[0].source).toBe('campaign');
    // Special 1500 beats campaign 1800.
    expect(variants[1].effectivePrice).toBe(1500);
    expect(variants[1].source).toBe('special');
  });

  it('is a no-op on empty or missing input', () => {
    expect(() => decorateVariantsPricing(undefined, 10)).not.toThrow();
    expect(() => decorateVariantsPricing([], 10)).not.toThrow();
  });

  it('skips entries without a price instead of writing NaN', () => {
    const variants: Array<Record<string, unknown>> = [{ id: 1, price: null }];
    decorateVariantsPricing(variants, 10);
    expect(variants[0].effectivePrice).toBeUndefined();
  });
});
