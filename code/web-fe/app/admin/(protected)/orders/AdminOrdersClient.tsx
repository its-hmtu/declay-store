'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import AdminToolbar, { FilterSelect } from '@/components/admin/AdminToolbar';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';
import { formatPrice } from '@/lib/utils';
import { orderLabel } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending_payment: 'warning',
  paid:            'info',
  processing:      'info',
  shipped:         'info',
  delivered:       'success',
  cancelled:       'error',
};

const STATUS_OPTS = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'];
// Các trạng thái admin ĐỔI TAY được. 'shipped' KHÔNG có ở đây: đơn chỉ chuyển
// sang shipped qua việc tạo vận đơn (mã + đơn vị VC), không phải đổi dropdown.
const MANUAL_STATUS_OPTS = ['paid', 'processing', 'delivered', 'cancelled'];

export default function AdminOrdersClient() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('all');

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Order[]>('/admin/orders?limit=100', { token })
      .then((res) => setOrders(res.data))
      .catch(() => toast.error('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => orders.filter((o) =>
    (search === '' || String(o.id).includes(search.replace('#', ''))) &&
    (status === 'all' || o.status === status),
  ), [orders, search, status]);

  const { page, setPage, totalPages, total, paged } = usePagination(filtered, 10);

  async function updateStatus(orderId: number, status: string) {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status }, { token });
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

      <AdminToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search by order #…">
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          label="Status"
          options={[{ value: 'all', label: 'All status' }, ...STATUS_OPTS.map((s) => ({ value: s, label: s.replace('_', ' ') }))]}
        />
      </AdminToolbar>

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
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No orders found.</td></tr>
            ) : (
              paged.map((order) => (
                <tr key={order.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-text">{orderLabel(order)}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-brand">{formatPrice(parseFloat(order.totalAmount))}</td>
                  <td className="px-4 py-3">
                    {MANUAL_STATUS_OPTS.includes(order.status) ? (
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="text-xs border border-border rounded-md px-2 py-1 bg-surface focus:outline-none focus:border-brand text-text"
                      >
                        {MANUAL_STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    ) : (
                      // shipped/returned/pending_payment: đặt bởi hệ thống, chỉ xem.
                      <span className="text-xs text-text-muted">{order.status.replace('_', ' ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/admin/orders/${order.id}`} className="text-xs text-brand hover:underline">Manage</Link>
                    <span className="text-text-faint mx-1.5">·</span>
                    <Link href={`/orders/${order.id}`} target="_blank" className="text-xs text-text-muted hover:underline">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
    </div>
  );
}
