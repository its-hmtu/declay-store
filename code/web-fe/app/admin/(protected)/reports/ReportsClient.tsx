'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TrendingUp, Eye, Package } from 'lucide-react';
import type { TopSkuReport, ProductViewRow } from '@/lib/types';
import { adminReportsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import FilterBar from '@/components/admin/FilterBar';
import { Card, CardContent } from '@/components/ui/card';

const PERIODS = [
  { value: '7d',  label: 'Last 7 days'  },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time'     },
];

export default function ReportsClient() {
  const [period, setPeriod] = useState('30d');
  const [report, setReport] = useState<TopSkuReport | null>(null);
  const [views, setViews]   = useState<ProductViewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [skus, v] = await Promise.all([
        adminReportsApi.topSkus(token, period, 20),
        adminReportsApi.productViews(token, 10),
      ]);
      setReport(skus.data);
      setViews(v.data);
    } catch {
      toast.error('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const totals = report?.totals;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Reports</h1>
          <p className="text-sm text-text-muted mt-1">Which products actually sell — the core validation metric.</p>
        </div>
      </div>

      {/* The report is only re-fetched when Apply commits the period. */}
      <FilterBar
        fields={[{ key: 'period', label: 'Period', type: 'select', options: PERIODS }]}
        values={{ period }}
        onValuesChange={(v) => setPeriod(v.period)}
      />

      {/* Totals */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Package size={18} />} label="Units sold" value={totals ? String(totals.totalUnits) : '—'} />
        <StatCard icon={<TrendingUp size={18} />} label="Revenue" value={totals ? `${formatPrice(totals.totalRevenue)}` : '—'} />
        <StatCard icon={<Eye size={18} />} label="SKUs with sales" value={totals ? String(totals.skuCount) : '—'} />
      </div>

      {/* Top SKUs */}
      <h2 className="font-medium text-text mb-3">Top selling SKUs</h2>
      <Card className="overflow-hidden py-0 mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Variant</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Share</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">Loading…</td></tr>
            )}
            {!loading && (report?.rows.length ?? 0) === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No sales in this period yet.</td></tr>
            )}
            {report?.rows.map((r) => (
              <tr key={r.variantId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-text-faint">{r.rank}</td>
                <td className="px-4 py-3 font-medium text-text">
                  {r.productId
                    ? <Link href={`/admin/products/${r.productId}`} className="hover:text-brand">{r.productName}</Link>
                    : r.productName}
                </td>
                <td className="px-4 py-3 text-text-muted">{r.variantName}</td>
                <td className="px-4 py-3 text-right font-medium text-text">{r.unitsSold}</td>
                <td className="px-4 py-3 text-right text-text-muted">{r.unitShare}%</td>
                <td className="px-4 py-3 text-right text-text-muted">{r.orderCount}</td>
                <td className="px-4 py-3 text-right text-text">{formatPrice(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Interest signal */}
      <h2 className="font-medium text-text mb-3">Most viewed products <span className="text-xs font-normal text-text-faint">(all time)</span></h2>
      <Card className="overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Views</th>
            </tr>
          </thead>
          <tbody>
            {views.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-text-muted">No data yet.</td></tr>
            )}
            {views.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text">
                  <Link href={`/admin/products/${v.id}`} className="hover:text-brand">{v.name}</Link>
                </td>
                <td className="px-4 py-3 text-right text-text-muted">{v.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-muted">{icon} {label}</p>
        <p className="mt-2 font-serif text-2xl font-bold text-text">{value}</p>
      </CardContent>
    </Card>
  );
}
