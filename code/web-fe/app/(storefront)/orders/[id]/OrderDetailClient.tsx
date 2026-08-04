'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle, Truck, Package, CreditCard, Clock, PackageCheck, XCircle, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Order, Shipment, OrderStatus } from '@/lib/types';
import { ordersApi, shipmentApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import OrderTimeline from '@/components/storefront/OrderTimeline';
import TrackingCode from '@/components/storefront/TrackingCode';
import ReturnForm from '@/components/storefront/ReturnForm';
import { formatPrice, orderLabel } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Skeleton } from '@/components/ui/skeleton';

const TERMINAL = ['delivered', 'cancelled', 'returned'];
const CANCELLABLE = ['pending_payment', 'paid', 'processing'];
const BLUE = '#2D6BFF';

// Kiểu pill trạng thái: xanh lá (xong), đỏ (huỷ), xanh dương (đang chạy), cam (chờ).
const STATUS_META: Record<string, { icon: typeof Truck; tone: 'success' | 'error' | 'blue' | 'warning' | 'muted' }> = {
  pending_payment: { icon: Clock, tone: 'warning' },
  paid:            { icon: CreditCard, tone: 'blue' },
  processing:      { icon: Package, tone: 'blue' },
  shipped:         { icon: Truck, tone: 'blue' },
  delivered:       { icon: PackageCheck, tone: 'success' },
  returned:        { icon: RotateCcw, tone: 'muted' },
  cancelled:       { icon: XCircle, tone: 'error' },
};

function pillStyle(tone: string): CSSProperties {
  if (tone === 'blue') return { background: '#EAF1FF', color: '#1B4DB3' };
  if (tone === 'success') return { background: 'var(--color-success-soft, #E5F4EA)', color: 'var(--color-success, #1E7B45)' };
  if (tone === 'error') return { background: 'var(--color-error-soft, #FBE9E9)', color: 'var(--color-error, #B42318)' };
  if (tone === 'warning') return { background: 'var(--color-warning-soft, #FBEFD9)', color: 'var(--color-warning, #92600A)' };
  return { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' };
}

export default function OrderDetailClient({
  orderId,
  embedded = false,
  onBack,
}: {
  orderId: number;
  /** M-31: nhúng trong section Profile — bỏ khung trang, nút quay lại gọi onBack. */
  embedded?: boolean;
  onBack?: () => void;
}) {
  const { t } = useT();
  const containerClass = embedded ? '' : 'max-w-3xl mx-auto px-4 sm:px-6 py-10';
  const [order,    setOrder]    = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnSent, setReturnSent] = useState(false);
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
        if (res.data.shipment) setShipment(res.data.shipment);
        else if (['shipped', 'delivered'].includes(res.data.status)) {
          shipmentApi.getMine(token!, orderId).then((s) => setShipment(s.data)).catch(() => undefined);
        }
        if (TERMINAL.includes(res.data.status) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch { /* keep last known state */ }
    }

    refresh().finally(() => setLoading(false));
    pollRef.current = setInterval(refresh, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  async function handleCancel() {
    const token = auth.getToken();
    if (!token || !order) return;
    if (!window.confirm('Bạn chắc chắn muốn huỷ đơn hàng này?')) return;
    setCancelling(true);
    try {
      const res = await ordersApi.cancel(token, orderId);
      if (res.data.outcome === 'cancelled') {
        setOrder(res.data.order);
        toast.success('Đã huỷ đơn. Nếu đã thanh toán, tiền sẽ được hoàn theo phương thức đã trả.');
      } else {
        setCancelRequested(true);
        toast.success('Đơn đã có vận đơn — yêu cầu huỷ đã gửi, chờ cửa hàng duyệt.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Huỷ đơn thất bại.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return (
    <div className={containerClass || 'py-6'}>
      <Skeleton className="h-8 w-56 mb-4" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
  if (!order) return <div className={`${containerClass || 'py-6'} text-center text-text-muted`}>Order not found.</div>;

  const st = order.status as OrderStatus;
  const meta = STATUS_META[st] ?? STATUS_META.pending_payment;
  const StatusIcon = meta.icon;
  const addr = order.shippingAddress;
  const addrLine = addr
    ? [addr.addressLine, addr.addressLine2, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')
    : null;
  const track = shipment ?? order.shipment;
  const money = (v?: string | number | null) => formatPrice(Number(v ?? 0));

  const items = order.items ?? [];
  const discount = Number(order.discountAmount ?? 0);
  const shipFee = Number(order.shippingFee ?? 0);
  const showActions = (CANCELLABLE.includes(st) && !cancelRequested) || (st === 'delivered' && !returnSent && !showReturn);

  return (
    <div className={containerClass}>
      {paymentSuccess && (
        <div className="mb-4 p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3 text-success">
          <CheckCircle size={20} />
          <p className="font-medium">Thanh toán thành công! Cửa hàng đang chuẩn bị đơn của bạn.</p>
        </div>
      )}

      {/* Thanh trên: quay lại · mã đơn + trạng thái */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-sm font-medium hover:underline" style={{ color: BLUE }}>← {t('orderDetail.back')}</button>
        ) : (
          <Link href="/account/orders" className="text-sm font-medium hover:underline" style={{ color: BLUE }}>← {t('orderDetail.back')}</Link>
        )}
        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-text-muted">{t('orderDetail.orderCodeLabel')}:</span>
          <span className="font-mono font-semibold text-text">{orderLabel(order)}</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={pillStyle(meta.tone)}>
            <StatusIcon size={13} /> {t(`status.${st}`)}
          </span>
        </div>
      </div>

      {/* Dòng thời gian (ngang) */}
      <section className="mb-4 rounded-xl border border-border bg-surface px-5 py-6">
        <OrderTimeline order={order} horizontal />
      </section>

      {/* Hàng nút hành động */}
      {showActions && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {CANCELLABLE.includes(st) && !cancelRequested && (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Đang huỷ…' : t('orderDetail.cancel')}
            </Button>
          )}
          {st === 'delivered' && !returnSent && !showReturn && (
            <Button variant="outline" size="sm" onClick={() => setShowReturn(true)}>{t('orderDetail.return')}</Button>
          )}
        </div>
      )}
      {cancelRequested && (
        <div className="mb-4 p-4 rounded-xl bg-warning/10 border border-warning/20 text-sm text-text">
          Yêu cầu huỷ đã được gửi. Cửa hàng sẽ duyệt và huỷ vận đơn trước khi hoàn tiền cho bạn.
        </div>
      )}
      {returnSent && (
        <div className="mb-4 p-4 rounded-xl bg-success/10 border border-success/20 text-sm text-text">
          Đã gửi yêu cầu trả hàng. Cửa hàng sẽ duyệt và hướng dẫn bạn gửi hàng về.
        </div>
      )}
      {showReturn && <div className="mb-4"><ReturnForm order={order} onDone={() => { setShowReturn(false); setReturnSent(true); }} /></div>}

      {/* Thông tin giao hàng */}
      {addr && (
        <section className="mb-4 rounded-xl border border-border bg-surface p-5">
          <h2 className="eyebrow mb-3">{t('orderDetail.deliveryInfo')}</h2>
          <div className="space-y-1.5 text-sm leading-relaxed">
            <p><span className="text-text-muted">{t('orderDetail.receiver')}: </span><span className="font-medium text-text">{addr.receiverName}</span></p>
            <p><span className="text-text-muted">{t('orderDetail.phone')}: </span><span className="text-text">{addr.receiverPhone}</span></p>
            <p><span className="text-text-muted">{t('orderDetail.address')}: </span><span className="text-text">{addrLine}</span></p>
            {order.notes && <p><span className="text-text-muted">{t('orderDetail.note')}: </span><span className="text-text">{order.notes}</span></p>}
          </div>
        </section>
      )}

      {/* Đơn vị vận chuyển */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="eyebrow mb-3">{t('orderDetail.carrierTitle')}</h2>
        {track?.trackingNumber ? (
          <TrackingCode trackingNumber={track.trackingNumber} carrier={track.carrier} />
        ) : (
          <p className="text-sm text-text-muted">{t('shipment.pending')}</p>
        )}
      </section>

      {/* Thông tin sản phẩm + thanh toán */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="eyebrow mb-3">{t('orderDetail.productInfo')}</h2>
        <div className="divide-y divide-border">
          {items.map((item) => {
            const img = item.variant?.images?.[0];
            return (
              <div key={item.id} className="flex items-center gap-4 py-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt flex items-center justify-center">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={item.productNameAtPurchase} className="size-full object-cover" />
                  ) : (
                    <Package size={22} className="text-text-faint" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{item.productNameAtPurchase}</p>
                  {item.variantNameAtPurchase && <p className="text-sm text-text-muted mt-0.5">{item.variantNameAtPurchase}</p>}
                </div>
                <p className="shrink-0 text-sm text-text">
                  {item.quantity} × <span className="font-medium">{money(item.priceAtPurchase)}</span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{t('orderDetail.promotion')}{order.discountCode ? ` (${order.discountCode.code})` : ''}</span>
            <span className="text-text">{discount > 0 ? `−${money(discount)}` : money(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{t('orderDetail.shippingFee')}</span>
            <span className="text-text">{shipFee === 0 ? t('orderDetail.free') : money(shipFee)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5 mt-1">
            <span className="font-medium text-text">{t('orderDetail.total')}</span>
            <span className="text-lg font-bold text-brand">{money(order.totalAmount)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
