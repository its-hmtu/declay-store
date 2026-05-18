'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending_payment: 'warning',
  paid:            'info',
  processing:      'info',
  shipped:         'info',
  delivered:       'success',
  cancelled:       'error',
};

const STATUS_OPTS = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersClient() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Order[]>('/admin/orders', { token })
      .then((res) => setOrders(res.data))
      .catch(() => toast.error('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(orderId: number, status: string) {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status }, { token });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as Order['status'] } : o));
      toast.success('Status updated.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  if (loading) return <div className="text-text-muted">Loading orders…</div>;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-6">Orders</h1>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Change Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No orders yet.</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">#{order.id}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-brand">${parseFloat(order.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="text-xs border border-border rounded-md px-2 py-1 bg-surface focus:outline-none focus:border-brand text-text"
                    >
                      {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/orders/${order.id}`} target="_blank" className="text-xs text-brand hover:underline">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
