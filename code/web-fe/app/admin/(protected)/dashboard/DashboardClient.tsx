'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Order, Product, Job } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';
import { orderLabel } from '@/lib/utils';

const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending_payment: 'warning',
  paid: 'info', processing: 'info', shipped: 'info',
  delivered: 'success', cancelled: 'error',
};

interface Stats {
  orders: number;
  revenue: number;
  products: number;
  openJobs: number;
  recent: Order[];
}

export default function DashboardClient() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;

    (async () => {
      try {
        const [ordersRes, productsRes, jobsRes] = await Promise.all([
          api.get<Order[]>('/admin/orders?limit=100', { token }),
          api.get<Product[]>('/admin/products?limit=1', { token }),
          api.get<Job[]>('/admin/jobs', { token }),
        ]);

        const orders = ordersRes.data ?? [];
        const revenue = orders
          .filter((o) => REVENUE_STATUSES.includes(o.status))
          .reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0);

        setStats({
          orders:   ordersRes.meta?.total ?? orders.length,
          revenue,
          products: productsRes.meta?.total ?? (productsRes.data?.length ?? 0),
          openJobs: (jobsRes.data ?? []).filter((j) => j.isOpen).length,
          recent:   orders.slice(0, 5),
        });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Total Orders',   value: loading ? '…' : String(stats?.orders ?? 0),                     sub: 'All time'  },
    { label: 'Revenue',        value: loading ? '…' : `${formatPrice((stats?.revenue ?? 0))}`,          sub: 'Paid orders' },
    { label: 'Products',       value: loading ? '…' : String(stats?.products ?? 0),                   sub: 'Total'     },
    { label: 'Open Positions', value: loading ? '…' : String(stats?.openJobs ?? 0),                   sub: 'Careers'   },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-2">Dashboard</h1>
      <p className="text-text-muted mb-8">Welcome to the Declay admin panel.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, sub }) => (
          <div key={label} className="p-5 rounded-xl border border-border bg-surface">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">{label}</p>
            <p className="font-serif text-3xl font-bold text-text">{value}</p>
            <p className="text-xs text-text-faint mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-text">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          {loading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : stats && stats.recent.length > 0 ? (
            <ul className="divide-y divide-border">
              {stats.recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-mono text-xs font-medium text-text">{orderLabel(o)}</span>
                  <Badge variant={STATUS_VARIANT[o.status] ?? 'default'}>{o.status.replace('_', ' ')}</Badge>
                  <span className="text-text-muted">{formatPrice(parseFloat(o.totalAmount))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No orders yet.</p>
          )}
        </div>

        <div className="p-6 rounded-xl border border-border bg-surface">
          <h2 className="font-serif text-lg font-semibold text-text mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/products/new', label: 'Add new product'     },
              { href: '/admin/articles/new', label: 'Write new article'   },
              { href: '/admin/jobs',         label: 'Manage job listings' },
              { href: '/admin/orders',       label: 'View orders'         },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="flex items-center gap-2 text-sm text-brand hover:underline">
                → {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
