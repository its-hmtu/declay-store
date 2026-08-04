'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Order } from '@/lib/types';
import { api, adminCancellationApi, adminReturnApi, type AdminCancellationRequest, type AdminReturnRequest } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import AdminToolbar, { FilterSelect } from '@/components/admin/AdminToolbar';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [cancels, setCancels] = useState<AdminCancellationRequest[]>([]);
  const [busyCancel, setBusyCancel] = useState<number | null>(null);
  const [returns, setReturns] = useState<AdminReturnRequest[]>([]);
  const [busyReturn, setBusyReturn] = useState<number | null>(null);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Order[]>('/admin/orders?limit=100', { token })
      .then((res) => setOrders(res.data))
      .catch(() => toast.error('Failed to load orders.'))
      .finally(() => setLoading(false));
    adminCancellationApi.list(token)
      .then((res) => setCancels(res.data))
      .catch(() => undefined);
    adminReturnApi.list(token)
      .then((res) => setReturns(res.data))
      .catch(() => undefined);
  }, []);

  async function resolveReturn(id: number, action: 'approve' | 'reject' | 'receive') {
    const token = adminAuth.getToken();
    if (!token) return;
    setBusyReturn(id);
    try {
      if (action === 'approve') {
        const tracking = window.prompt('Mã vận đơn trả GHN (bỏ trống nếu chưa có):') ?? undefined;
        await adminReturnApi.approve(token, id, tracking || undefined);
        setReturns((prev) => prev.map((r) => r.id === id ? { ...r, status: 'awaiting_return' } : r));
      } else if (action === 'reject') {
        await adminReturnApi.reject(token, id);
        setReturns((prev) => prev.filter((r) => r.id !== id));
      } else {
        await adminReturnApi.receive(token, id);
        setReturns((prev) => prev.filter((r) => r.id !== id));
        api.get<Order[]>('/admin/orders?limit=100', { token }).then((r) => setOrders(r.data)).catch(() => undefined);
      }
      toast.success('Đã xử lý yêu cầu trả.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xử lý thất bại.');
    } finally {
      setBusyReturn(null);
    }
  }

  async function resolveCancel(id: number, action: 'approve' | 'reject') {
    const token = adminAuth.getToken();
    if (!token) return;
    setBusyCancel(id);
    try {
      if (action === 'approve') await adminCancellationApi.approve(token, id);
      else await adminCancellationApi.reject(token, id);
      setCancels((prev) => prev.filter((c) => c.id !== id));
      toast.success(action === 'approve' ? 'Đã duyệt và huỷ đơn.' : 'Đã từ chối yêu cầu.');
      // Đơn có thể đã đổi trạng thái sang cancelled — nạp lại danh sách.
      api.get<Order[]>('/admin/orders?limit=100', { token }).then((r) => setOrders(r.data)).catch(() => undefined);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xử lý thất bại.');
    } finally {
      setBusyCancel(null);
    }
  }

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

  if (loading) return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-4">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-6">Orders</h1>

      {cancels.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <h2 className="font-medium text-text mb-3">Yêu cầu huỷ chờ duyệt ({cancels.length})</h2>
          <p className="text-xs text-text-muted mb-3">
            Duyệt sẽ huỷ vận đơn với GHN rồi hoàn tiền. Nếu GHN đã lấy hàng, huỷ sẽ báo lỗi — khi đó xử lý theo luồng trả hàng.
          </p>
          <ul className="space-y-2">
            {cancels.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 flex-wrap text-sm border-t border-warning/20 pt-2">
                <div>
                  <Link href={`/admin/orders/${c.orderId}`} className="font-mono text-brand hover:underline">
                    {c.order?.orderCode ?? `#${c.orderId}`}
                  </Link>
                  <span className="text-text-muted ml-2">{c.reason ?? 'Khách yêu cầu huỷ'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyCancel === c.id}
                    onClick={() => resolveCancel(c.id, 'approve')}
                    className="text-xs px-3 py-1 rounded-md bg-error text-white disabled:opacity-50"
                  >
                    Duyệt huỷ
                  </button>
                  <button
                    type="button"
                    disabled={busyCancel === c.id}
                    onClick={() => resolveCancel(c.id, 'reject')}
                    className="text-xs px-3 py-1 rounded-md border border-border text-text disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {returns.length > 0 && (
        <div className="mb-6 rounded-xl border border-info/30 bg-info/5 p-4">
          <h2 className="font-medium text-text mb-3">Yêu cầu trả hàng ({returns.length})</h2>
          <ul className="space-y-3">
            {returns.map((r) => (
              <li key={r.id} className="border-t border-info/20 pt-3 text-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <Link href={`/admin/orders/${r.orderId}`} className="font-mono text-brand hover:underline">
                      {r.order?.orderCode ?? `#${r.orderId}`}
                    </Link>
                    <span className="ml-2 text-text-muted">{r.status.replace('_', ' ')} · {r.items?.length ?? 0} món</span>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <>
                        <button type="button" disabled={busyReturn === r.id} onClick={() => resolveReturn(r.id, 'approve')}
                          className="text-xs px-3 py-1 rounded-md bg-brand text-white disabled:opacity-50">Duyệt</button>
                        <button type="button" disabled={busyReturn === r.id} onClick={() => resolveReturn(r.id, 'reject')}
                          className="text-xs px-3 py-1 rounded-md border border-border text-text disabled:opacity-50">Từ chối</button>
                      </>
                    )}
                    {(r.status === 'approved' || r.status === 'awaiting_return') && (
                      <button type="button" disabled={busyReturn === r.id} onClick={() => resolveReturn(r.id, 'receive')}
                        className="text-xs px-3 py-1 rounded-md bg-success text-white disabled:opacity-50">Đã nhận hàng + hoàn tiền</button>
                    )}
                  </div>
                </div>
                {r.items && r.items.length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {r.items.flatMap((it) => it.photoUrls).slice(0, 6).map((u) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={u} src={u} alt="bằng chứng" className="h-12 w-12 object-cover rounded border border-border" />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
