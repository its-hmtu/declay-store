import { describe, it, expect } from 'vitest';
import {
  rankSkus, summariseCampaigns,
  type SkuSalesRow, type CampaignPerformanceRow,
} from '@/modules/report/report.metrics';

function sku(over: Partial<SkuSalesRow> = {}): SkuSalesRow {
  return {
    variantId: 1,
    productId: 10,
    productName: 'Dragon figure',
    variantName: 'Standard',
    unitsSold: 10,
    revenue: 1000,
    orderCount: 8,
    ...over,
  };
}

describe('rankSkus — campaign split', () => {
  it('separates campaign-driven units from organic ones', () => {
    const [row] = rankSkus([sku({ unitsSold: 10, campaignUnits: 7 })]);
    expect(row.organicUnits).toBe(3);
    expect(row.campaignDependency).toBe(70);
  });

  it('treats a SKU with no campaign units as fully organic', () => {
    const [row] = rankSkus([sku({ unitsSold: 10 })]);
    expect(row.campaignUnits).toBe(0);
    expect(row.organicUnits).toBe(10);
    expect(row.campaignDependency).toBe(0);
  });

  it('does not report negative organic units if data is inconsistent', () => {
    const [row] = rankSkus([sku({ unitsSold: 5, campaignUnits: 9 })]);
    expect(row.organicUnits).toBe(0);
  });

  it('keeps ranking on total units — the split is context, not the ranking key', () => {
    const rows = rankSkus([
      sku({ variantId: 1, unitsSold: 20, campaignUnits: 20 }), // all discounted
      sku({ variantId: 2, unitsSold: 15, campaignUnits: 0 }),  // all full price
    ]);
    expect(rows.map((r) => r.variantId)).toEqual([1, 2]);
    // But the reader can now see #1 sold nothing at full price.
    expect(rows[0].campaignDependency).toBe(100);
    expect(rows[1].campaignDependency).toBe(0);
  });

  it('handles a zero-unit row without dividing by zero', () => {
    const [row] = rankSkus([sku({ unitsSold: 0, campaignUnits: 0 })]);
    expect(row.campaignDependency).toBe(0);
  });
});

describe('summariseCampaigns', () => {
  function campaign(over: Partial<CampaignPerformanceRow> = {}): CampaignPerformanceRow {
    return {
      campaignId: 1,
      campaignName: 'Tet Sale',
      unitsSold: 10,
      orderCount: 6,
      revenue: 7000,
      grossRevenue: 10000,
      discountGiven: 3000,
      discountRate: 0,
      ...over,
    };
  }

  it('computes the discount rate against list price', () => {
    const [row] = summariseCampaigns([campaign()]);
    expect(row.discountRate).toBe(30);
  });

  it('sorts by collected revenue, biggest first', () => {
    const rows = summariseCampaigns([
      campaign({ campaignId: 1, revenue: 5000 }),
      campaign({ campaignId: 2, revenue: 9000 }),
    ]);
    expect(rows.map((r) => r.campaignId)).toEqual([2, 1]);
  });

  it('avoids dividing by zero when nothing sold', () => {
    const [row] = summariseCampaigns([campaign({ revenue: 0, grossRevenue: 0, discountGiven: 0 })]);
    expect(row.discountRate).toBe(0);
  });

  it('keeps the snapshot name for a deleted campaign', () => {
    const [row] = summariseCampaigns([campaign({ campaignId: null, campaignName: 'Deleted campaign' })]);
    expect(row.campaignId).toBeNull();
    expect(row.campaignName).toBe('Deleted campaign');
  });
});
