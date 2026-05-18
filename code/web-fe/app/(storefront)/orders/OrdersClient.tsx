'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/types';
import { ordersApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending_payment: 'warning',
  paid:            'info',
  processing:      'info',
  shipped:         'info',
  delivered:       'success',
  cancelled:       'error',
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid:            'Paid',
  processing:      'Processing',
  shipped:         'Shipped',
  delivered:       'Delivered',
  cancelled:       'Cancelled',
};

export default function OrdersClient() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }
    ordersApi.list(token)
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-text-muted">Loading orders…</div>
  );

  if (!auth.isLoggedIn()) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
      <p className="text-text-muted mb-4">Please log in to view your orders.</p>
      <Link href="/login" className="text-brand hover:underline font-medium">Log in</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-text mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="py-16 text-center text-text-muted">
          <p>You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="mt-4 inline-block text-brand hover:underline font-medium">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block p-5 rounded-xl border border-border bg-surface hover:border-brand-lighter transition-colors"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-text">Order #{order.id}</p>
                  <p className="text-sm text-text-muted mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </Badge>
                  <p className="font-semibold text-brand">${parseFloat(order.totalAmount).toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
