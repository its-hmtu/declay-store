'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, Shipment } from '@/lib/types';
import { api, adminShipmentApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending_payment: 'warning', paid: 'info', processing: 'info', shipped: 'info', delivered: 'success', returned: 'warning', cancelled: 'error',
};

export default function AdminOrderDetailClient({ orderId }: { orderId: number }) {
  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Order>(`/admin/orders/${orderId}`, { token })
      .then((res) => setOrder(res.data))
      .catch(() => toast.error('Order not found.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // M-06: returns are accepted for 7 days after delivery (BR-06).
  async function requestReturn() {
    const reason = prompt('Reason for the return?')?.trim();
    if (!reason) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.post<Order>(`/admin/orders/${orderId}/return`, { reason }, { token });
      setOrder(res.data);
      toast.success('Order marked as returned.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Return failed.');
    }
  }

  if (loading)  return <div className="text-text-muted">Loading…</div>;
  if (!order)   return <div className="text-text-muted">Order not found.</div>;

  const items = order.items ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Order #{order.id}</h1>
        <Link href="/admin/orders" className="text-sm text-brand hover:underline">&larr; Orders</Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>{order.status.replace('_', ' ')}</Badge>
          <span className="text-sm text-text-muted">{new Date(order.createdAt).toLocaleString()}</span>
        </div>
        {items.length > 0 && (
          <div className="text-sm divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between py-2 text-text-muted">
                <span>{it.productNameAtPurchase} ({it.variantNameAtPurchase}) × {it.quantity}</span>
                <span>{formatPrice((parseFloat(it.priceAtPurchase) * it.quantity))}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-border font-semibold text-text">
          <span>Total</span><span className="text-brand">{formatPrice(parseFloat(order.totalAmount))}</span>
        </div>
      </div>

      {/* M-06: return window */}
      {(order.status === 'delivered' || order.status === 'returned') && (
        <div className="rounded-xl border border-border bg-surface p-5 mb-6">
          <h2 className="font-medium text-text mb-2">Return</h2>
          {order.status === 'returned' ? (
            <p className="text-sm text-text-muted">
              Returned{order.returnedAt ? ` on ${new Date(order.returnedAt).toLocaleDateString()}` : ''}
              {order.returnReason ? ` — ${order.returnReason}` : ''}
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                {order.deliveredAt
                  ? `Returns accepted until ${new Date(new Date(order.deliveredAt).getTime() + 7 * 86400000).toLocaleDateString()} (7 days after delivery).`
                  : 'No delivery date recorded — returns cannot be processed.'}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={requestReturn} disabled={!order.deliveredAt}>
                Mark as returned
              </Button>
            </div>
          )}
        </div>
      )}

      <ShipmentManager orderId={orderId} />
    </div>
  );
}

function ShipmentManager({ orderId }: { orderId: number }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [form, setForm] = useState({ carrier: '', trackingNumber: '', shippedAt: '', estimatedDeliveryAt: '', deliveredAt: '' });
  const [saving, setSaving] = useState(false);

  function fillFrom(s: Shipment | null) {
    setForm({
      carrier: s?.carrier ?? '',
      trackingNumber: s?.trackingNumber ?? '',
      shippedAt: s?.shippedAt ? s.shippedAt.slice(0, 10) : '',
      estimatedDeliveryAt: s?.estimatedDeliveryAt ? s.estimatedDeliveryAt.slice(0, 10) : '',
      deliveredAt: s?.deliveredAt ? s.deliveredAt.slice(0, 10) : '',
    });
  }

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminShipmentApi.get(token, orderId);
      setShipment(res.data);
      fillFrom(res.data);
    } catch {
      setShipment(null); // 404 — no shipment yet
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orderId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      carrier: form.carrier,
      trackingNumber: form.trackingNumber,
      shippedAt: form.shippedAt ? new Date(form.shippedAt).toISOString() : undefined,
      estimatedDeliveryAt: form.estimatedDeliveryAt ? new Date(form.estimatedDeliveryAt).toISOString() : null,
    };
    if (shipment && form.deliveredAt) body.deliveredAt = new Date(form.deliveredAt).toISOString();
    try {
      const res = shipment
        ? await adminShipmentApi.update(token, orderId, body)
        : await adminShipmentApi.create(token, orderId, body);
      setShipment(res.data);
      fillFrom(res.data);
      toast.success(shipment ? 'Shipment updated.' : 'Shipment created.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this shipment?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await adminShipmentApi.remove(token, orderId);
      setShipment(null);
      fillFrom(null);
      toast.success('Shipment deleted.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function createViaProvider() {
    const token = adminAuth.getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await adminShipmentApi.createViaProvider(token, orderId);
      setShipment(res.data); fillFrom(res.data);
      toast.success('Shipment created via provider.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create shipment.');
    } finally { setSaving(false); }
  }

  async function simulate(status: string) {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminShipmentApi.simulate(token, orderId, status);
      setShipment(res.data); fillFrom(res.data);
      toast.success(`Simulated: ${status}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Simulation failed.');
    }
  }

  if (loading) return <div className="text-text-muted text-sm">Loading shipment…</div>;

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={save} className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-text flex items-center gap-2"><Truck size={17} /> Shipment</h2>
        {shipment && (
          <button type="button" onClick={remove} className="text-text-faint hover:text-error" aria-label="Delete shipment"><Trash2 size={15} /></button>
        )}
      </div>

      {shipment && (
        <div className="rounded-lg border border-border bg-surface-alt p-3 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Provider: <span className="text-text font-medium">{shipment.provider}</span></span>
            <span className="text-xs font-medium rounded px-2 py-0.5 bg-brand-faint text-brand">{shipment.status}</span>
          </div>
          {shipment.lastEvent && (
            <p className="text-text-muted">Last event: <span className="text-text">{shipment.lastEvent}</span>{shipment.lastEventAt ? ` · ${new Date(shipment.lastEventAt).toLocaleString()}` : ''}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-1 text-xs">
            {shipment.labelUrl && <a href={shipment.labelUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">Label</a>}
            {shipment.podUrl && <a href={shipment.podUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">Proof of delivery</a>}
            {shipment.incoterm && <span className="text-text-faint">Incoterm: {shipment.incoterm}</span>}
            {shipment.cost != null && <span className="text-text-faint">Cost: {shipment.cost} {shipment.currency}</span>}
          </div>
          {shipment.providerShipmentId && !['delivered', 'returned', 'cancelled'].includes(shipment.status) && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-text-faint">Simulate:</span>
              <button type="button" onClick={() => simulate('in_transit')} className="text-xs px-2 py-1 rounded border border-border hover:border-brand hover:text-brand">In transit</button>
              <button type="button" onClick={() => simulate('out_for_delivery')} className="text-xs px-2 py-1 rounded border border-border hover:border-brand hover:text-brand">Out for delivery</button>
              <button type="button" onClick={() => simulate('delivered')} className="text-xs px-2 py-1 rounded border border-border hover:border-brand hover:text-brand">Delivered</button>
            </div>
          )}
        </div>
      )}

      {!shipment && (
        <div className="rounded-lg border border-dashed border-border p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-text-muted">Create a shipment automatically via the shipping provider (mock until an Easyship token is set).</p>
          <Button type="button" size="sm" variant="outline" loading={saving} onClick={createViaProvider}>Create with provider</Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Carrier *</label>
          <input required value={form.carrier} onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} className={inputCls} placeholder="GHN / VNPost / DHL" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Tracking number *</label>
          <input required value={form.trackingNumber} onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))} className={`${inputCls} font-mono`} placeholder="VN123456789" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Shipped at</label>
          <input type="date" value={form.shippedAt} onChange={(e) => setForm((f) => ({ ...f, shippedAt: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Est. delivery</label>
          <input type="date" value={form.estimatedDeliveryAt} onChange={(e) => setForm((f) => ({ ...f, estimatedDeliveryAt: e.target.value }))} className={inputCls} />
        </div>
        {shipment && (
          <div>
            <label className="block text-xs font-medium text-text mb-1">Delivered at</label>
            <input type="date" value={form.deliveredAt} onChange={(e) => setForm((f) => ({ ...f, deliveredAt: e.target.value }))} className={inputCls} />
          </div>
        )}
      </div>
      <Button type="submit" size="sm" loading={saving}>{shipment ? 'Update shipment' : 'Create shipment'}</Button>
    </form>
  );
}
