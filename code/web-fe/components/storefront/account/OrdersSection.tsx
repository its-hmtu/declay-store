'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import type { Order } from '@/lib/types';
import { ordersApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, orderLabel } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';

type Filter = 'all' | 'processing' | 'delivered' | 'cancelled';

const FILTER_MATCH: Record<Filter, (s: string) => boolean> = {
  all: () => true,
  processing: (s) => ['pending_payment', 'paid', 'processing', 'shipped'].includes(s),
  delivered: (s) => s === 'delivered',
  cancelled: (s) => ['cancelled', 'returned'].includes(s),
};

/** Màu chữ cho nhãn trạng thái (xanh dương = đang chạy, lá = xong, đỏ = huỷ). */
function statusColor(status: string): { className?: string; style?: CSSProperties } {
  switch (status) {
    case 'delivered':       return { className: 'text-success' };
    case 'cancelled':       return { className: 'text-error' };
    case 'returned':        return { className: 'text-text-muted' };
    case 'pending_payment': return { className: 'text-warning' };
    case 'shipped':
    case 'processing':
    case 'paid':            return { style: { color: '#2D6BFF' } };
    default:                return { className: 'text-text-muted' };
  }
}

/**
 * M-32: danh sách đơn (Purchase History). Mỗi đơn là một thẻ:
 *   - Đầu: mã đơn + link "Chi tiết".
 *   - Thanh thông tin: ngày đặt + trạng thái | tổng tiền theo số sản phẩm.
 *   - Từng dòng sản phẩm: ảnh + tên (phân loại) + "số lượng × đơn giá".
 */
export default function OrdersSection() {
  const { t } = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }
    ordersApi.list(token)
      .then((res) => setOrders(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => orders.filter((o) => FILTER_MATCH[filter](o.status)), [orders, filter]);

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-3xl font-bold text-text">{t('accountNav.myOrders')}</h1>
        {orders.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-text-muted">
            {t('orders.viewBy')}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand focus:outline-none"
            >
              <option value="all">{t('orders.filterAll')}</option>
              <option value="processing">{t('orders.filterProcessing')}</option>
              <option value="delivered">{t('orders.filterDelivered')}</option>
              <option value="cancelled">{t('orders.filterCancelled')}</option>
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-14 text-center text-text-muted">
          <Package size={28} className="mx-auto mb-3 text-text-faint" />
          <p>{t('account.noOrders')}</p>
          <Link href="/products" className="mt-3 inline-block font-medium text-brand hover:underline">{t('cart.continueShopping')}</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((order) => {
            const tone = statusColor(order.status);
            const items = order.items ?? [];
            const count = items.reduce((n, i) => n + i.quantity, 0);
            return (
              <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                {/* Đầu thẻ: mã đơn + Chi tiết */}
                <div className="flex items-center justify-between gap-3 px-5 pt-4">
                  <p className="font-mono text-base font-semibold text-text">#{orderLabel(order)}</p>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-0.5 text-sm font-medium hover:underline"
                    style={{ color: '#2D6BFF' }}
                  >
                    {t('orders.detail')} <ChevronRight size={16} />
                  </Link>
                </div>

                {/* Thanh thông tin */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-surface-alt px-5 py-2.5 text-sm">
                  <div className="text-text-muted">
                    {t('orders.orderDate')}:{' '}
                    <span className="font-medium text-text">
                      {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(order.createdAt))}
                    </span>
                    <span className="mx-2 text-border-strong">·</span>
                    <span className={tone.className} style={tone.style}>{t(`status.${order.status}`)}</span>
                  </div>
                  <div className="text-text-muted">
                    {t('orders.total')} ({count} {t('orders.products')}):{' '}
                    <span className="font-semibold text-brand">{formatPrice(parseFloat(order.totalAmount))}</span>
                  </div>
                </div>

                {/* Dòng sản phẩm */}
                <div className="divide-y divide-border px-5">
                  {items.map((item) => {
                    const img = item.variant?.images?.[0];
                    return (
                      <div key={item.id} className="flex items-center gap-4 py-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt flex items-center justify-center">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={item.productNameAtPurchase} className="size-full object-cover" />
                          ) : (
                            <Package size={18} className="text-text-faint" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text line-clamp-2">{item.productNameAtPurchase}</p>
                          {item.variantNameAtPurchase && (
                            <p className="text-xs text-text-muted mt-0.5">{item.variantNameAtPurchase}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm text-text">
                          {item.quantity} × <span className="font-medium">{formatPrice(parseFloat(item.priceAtPurchase))}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
