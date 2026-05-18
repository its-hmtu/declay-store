'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import type { Order } from '@/lib/types';
import { ordersApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending_payment: 'warning',
  paid: 'info', processing: 'info', shipped: 'info',
  delivered: 'success', cancelled: 'error',
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending Payment', paid: 'Paid', processing: 'Processing',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};

export default function OrderDetailClient({ orderId }: { orderId: number }) {
  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }
    ordersApi.detail(token, orderId)
      .then((res) => setOrder(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-text-muted">Loading…</div>;
  if (!order)  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-text-muted">Order not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {paymentSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3 text-success">
          <CheckCircle size={20} />
          <div>
            <p className="font-medium">Payment successful!</p>
            <p className="text-sm">We&apos;re getting your order ready.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Order #{order.id}</h1>
          <p className="text-sm text-text-muted mt-1">
            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
          {STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {order.items?.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="font-medium text-text">{item.productNameAtPurchase}</p>
              <p className="text-sm text-text-muted">{item.variantNameAtPurchase} × {item.quantity}</p>
            </div>
            <p className="font-medium text-text shrink-0">
              ${(parseFloat(item.priceAtPurchase) * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
        <div className="flex justify-between p-4 font-semibold text-text">
          <span>Total</span>
          <span>${parseFloat(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/orders" className="text-sm text-brand hover:underline">
          &larr; Back to orders
        </Link>
      </div>
    </div>
  );
}
