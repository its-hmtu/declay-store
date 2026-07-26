'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Truck } from 'lucide-react';
import type { Order, Shipment } from '@/lib/types';
import { ordersApi, shipmentApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import OrderProgress from '@/components/storefront/OrderProgress';
import { formatPrice } from '@/lib/utils';

const TERMINAL = ['delivered', 'cancelled'];

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
  const [order,    setOrder]    = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading,  setLoading]  = useState(true);
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }

    async function refresh() {
      try {
        const res = await ordersApi.detail(token!, orderId);
        setOrder(res.data);
        // Shipment exists only once shipped — ignore the 404 before then
        if (['shipped', 'delivered'].includes(res.data.status)) {
          shipmentApi.getMine(token!, orderId).then((s) => setShipment(s.data)).catch(() => undefined);
        }
        // Stop polling once the order reaches a terminal state
        if (TERMINAL.includes(res.data.status) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch { /* keep last known state */ }
    }

    refresh().finally(() => setLoading(false));
    // Live-update while the order is still moving through fulfillment
    pollRef.current = setInterval(refresh, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

      {/* Progress */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 mb-6">
        <OrderProgress status={order.status} />

        {shipment && (
          <div className="mt-6 pt-5 border-t border-border grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-faint text-xs uppercase tracking-wider mb-0.5 flex items-center gap-1"><Truck size={12} /> Carrier</p>
              <p className="text-text font-medium">{shipment.carrier}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs uppercase tracking-wider mb-0.5">Tracking #</p>
              <p className="text-text font-mono text-xs">{shipment.trackingNumber}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs uppercase tracking-wider mb-0.5">
                {shipment.deliveredAt ? 'Delivered' : 'Est. delivery'}
              </p>
              <p className="text-text font-medium">
                {new Date(shipment.deliveredAt ?? shipment.estimatedDeliveryAt ?? shipment.shippedAt)
                  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}
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
              {formatPrice((parseFloat(item.priceAtPurchase) * item.quantity))}
            </p>
          </div>
        ))}
        <div className="flex justify-between p-4 font-semibold text-text">
          <span>Total</span>
          <span>{formatPrice(parseFloat(order.totalAmount))}</span>
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
