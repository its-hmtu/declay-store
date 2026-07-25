import { describe, it, expect } from 'vitest';
import { rankSkus, summariseSales, periodStart, type SkuSalesRow } from '@/modules/report/report.metrics';

const row = (variantId: number, unitsSold: number, revenue: number): SkuSalesRow => ({
  variantId, productId: variantId * 10, productName: `P${variantId}`, variantName: 'Default',
  unitsSold, revenue, orderCount: 1,
});

describe('rankSkus (M-05)', () => {
  it('ranks by units sold, descending', () => {
    const ranked = rankSkus([row(1, 3, 300), row(2, 9, 200), row(3, 5, 100)]);
    expect(ranked.map((r) => r.variantId)).toEqual([2, 3, 1]);
    expect(ranked[0].rank).toBe(1);
  });
  it('breaks ties on revenue', () => {
    const ranked = rankSkus([row(1, 5, 100), row(2, 5, 500)]);
    expect(ranked.map((r) => r.variantId)).toEqual([2, 1]);
  });
  it('computes each SKU share of total units', () => {
    const ranked = rankSkus([row(1, 25, 10), row(2, 75, 10)]);
    expect(ranked[0].unitShare).toBe(75);
    expect(ranked[1].unitShare).toBe(25);
  });
  it('respects the limit', () => {
    expect(rankSkus([row(1, 1, 1), row(2, 2, 2), row(3, 3, 3)], 2)).toHaveLength(2);
  });
  it('handles an empty period without dividing by zero', () => {
    expect(rankSkus([])).toEqual([]);
  });
});

describe('summariseSales', () => {
  it('totals units, revenue and SKU count', () => {
    expect(summariseSales([row(1, 2, 10.5), row(2, 3, 20.25)]))
      .toEqual({ totalUnits: 5, totalRevenue: 30.75, skuCount: 2 });
  });
});

describe('periodStart', () => {
  const now = new Date('2026-07-31T00:00:00Z');
  it('resolves day shortcuts', () => {
    expect(periodStart('7d', now)?.toISOString()).toBe('2026-07-24T00:00:00.000Z');
    expect(periodStart('30d', now)?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
  it('returns null for all-time', () => {
    expect(periodStart('all', now)).toBeNull();
  });
});
