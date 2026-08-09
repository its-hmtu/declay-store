/**
 * Per-SKU sales metrics (M-05). Pure + testable — the core instrument for the
 * validation goal "which SKUs sell best" (see discovery 00/02).
 */
export interface SkuSalesRow {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  /**
   * M-41: units sold while a campaign was setting the price. Without this split,
   * "best seller" and "was on sale" are indistinguishable — which would make the
   * validation month's headline conclusion unusable.
   */
  campaignUnits?: number;
  /** Money given away by campaigns on this SKU in the period. */
  campaignDiscount?: number;
}

export interface RankedSku extends SkuSalesRow {
  rank: number;
  /** Share of total units sold, in percent (one decimal). */
  unitShare: number;
  /** Units sold at full price (unitsSold − campaignUnits). */
  organicUnits: number;
  /** Share of this SKU's units that needed a campaign, in percent (one decimal). */
  campaignDependency: number;
}

export interface CampaignPerformanceRow {
  campaignId: number | null;
  campaignName: string;
  unitsSold: number;
  orderCount: number;
  /** Revenue actually collected on campaign-priced lines. */
  revenue: number;
  /** Revenue those lines would have made at list price. */
  grossRevenue: number;
  discountGiven: number;
  /** discountGiven ÷ grossRevenue, in percent (one decimal). */
  discountRate: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Rank SKUs by units sold (revenue breaks ties) and attach each one's share of
 * total volume. Returns at most `limit` rows.
 */
export function rankSkus(rows: SkuSalesRow[], limit = 20): RankedSku[] {
  const totalUnits = rows.reduce((sum, r) => sum + r.unitsSold, 0);
  return [...rows]
    .sort((a, b) => (b.unitsSold - a.unitsSold) || (b.revenue - a.revenue))
    .slice(0, limit)
    .map((r, i) => {
      const campaignUnits = r.campaignUnits ?? 0;
      return {
        ...r,
        revenue: round2(r.revenue),
        campaignUnits,
        campaignDiscount: round2(r.campaignDiscount ?? 0),
        organicUnits: Math.max(0, r.unitsSold - campaignUnits),
        campaignDependency: r.unitsSold > 0 ? Math.round((campaignUnits / r.unitsSold) * 1000) / 10 : 0,
        rank: i + 1,
        unitShare: totalUnits > 0 ? Math.round((r.unitsSold / totalUnits) * 1000) / 10 : 0,
      };
    });
}

/**
 * Aggregate order lines by campaign. `discountRate` answers "how much margin did
 * this campaign cost per dong of list price" — the number that decides whether to
 * run it again.
 */
export function summariseCampaigns(rows: CampaignPerformanceRow[]): CampaignPerformanceRow[] {
  return [...rows]
    .map((r) => ({
      ...r,
      revenue: round2(r.revenue),
      grossRevenue: round2(r.grossRevenue),
      discountGiven: round2(r.discountGiven),
      discountRate: r.grossRevenue > 0 ? Math.round((r.discountGiven / r.grossRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Totals across every SKU in the period (not just the returned page). */
export function summariseSales(rows: SkuSalesRow[]): {
  totalUnits: number; totalRevenue: number; skuCount: number;
} {
  return {
    totalUnits: rows.reduce((s, r) => s + r.unitsSold, 0),
    totalRevenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
    skuCount: rows.length,
  };
}

/** Resolve a period shortcut ('7d' | '30d' | '90d' | 'all') to a start date. */
export function periodStart(period: string, now: Date = new Date()): Date | null {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null;
  if (days === null) return null; // 'all'
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
