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
}

export interface RankedSku extends SkuSalesRow {
  rank: number;
  /** Share of total units sold, in percent (one decimal). */
  unitShare: number;
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
    .map((r, i) => ({
      ...r,
      revenue: round2(r.revenue),
      rank: i + 1,
      unitShare: totalUnits > 0 ? Math.round((r.unitsSold / totalUnits) * 1000) / 10 : 0,
    }));
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
