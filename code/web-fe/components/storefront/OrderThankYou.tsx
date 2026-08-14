'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';
import Button from '@/components/ui/Button';
import TrackingCode from '@/components/storefront/TrackingCode';

export interface ThankYouSummary {
  orderCode: string;
  status: string;
  orderDate: string;
  maskedEmail: string | null;
  items: { productName: string; variantName: string | null; quantity: number; unitPrice: number }[];
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: { receiverName: string; line: string } | null;
  shippingMethodName: string | null;
  estimatedDeliveryAt: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  isGuest: boolean;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function formatDeliveryDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit',
  }).format(new Date(iso));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="font-serif text-2xl font-bold text-text mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-text mb-1">{label}</p>
      <div className="text-text-muted leading-relaxed">{children}</div>
    </div>
  );
}

/**
 * M-19: trang cảm ơn, bố cục theo mẫu của Nike.
 *
 * Thứ tự thông tin bám theo câu hỏi khách hỏi trong đầu, không theo cấu trúc
 * cơ sở dữ liệu:
 *   1. Đơn có thành công không?      -> tiêu đề + dấu tích
 *   2. Bao nhiêu món, hết bao nhiêu? -> dòng tóm tắt ngay dưới tiêu đề
 *   3. Tra cứu bằng gì?              -> mã đơn, ngày đặt, email đã nhận xác nhận
 *   4. Hàng về đâu, khi nào?         -> phần Giao hàng
 *   5. Mình đã mua gì?               -> phần Đơn hàng
 *
 * Dùng chung cho cả luồng COD và luồng VNPay để hai màn hình không lệch nhau.
 */
export default function OrderThankYou({
  summary,
  showViewOrder = false,
  orderId,
}: {
  summary: ThankYouSummary;
  /** Chỉ bật cho thành viên — khách vãng lai không mở được /orders/:id. */
  showViewOrder?: boolean;
  orderId?: number | null;
}) {
  const { t } = useT();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      {/* 1 + 2: kết quả và con số tổng quát */}
      <div className="text-center mb-10">
        <h1 className="font-serif text-4xl font-bold text-text">{t('thankYou.title')}</h1>
        <p className="mt-2 text-text-muted">
          {t('thankYou.itemCount', { count: summary.itemCount })}
          <span className="mx-2 text-border-strong">·</span>
          <span className="font-medium text-text">{formatPrice(summary.totalAmount)}</span>
        </p>
      </div>

      {/* 3: xác nhận + thông tin tra cứu */}
      <div className="mb-10">
        <h2 className="font-serif text-2xl font-bold text-text leading-snug flex items-start gap-2">
          <span>{t('thankYou.placed')}</span>
          <Check size={26} className="text-success shrink-0 mt-1" />
        </h2>

        <p className="mt-3 font-medium text-text">{t('thankYou.checkEmail')}</p>

        <div className="mt-2 space-y-1 text-text-muted">
          <p>
            {t('thankYou.yourOrder')}{' '}
            <span className="font-mono text-text">{summary.orderCode}</span>
          </p>
          <p>{t('thankYou.orderDate')} {formatDateTime(summary.orderDate)}</p>
          {summary.maskedEmail && (
            <p>
              {t('thankYou.sentTo')}{' '}
              <span className="font-medium text-text">{summary.maskedEmail}</span>
            </p>
          )}
        </div>
      </div>

      {/* 4: giao hàng */}
      <Section title={t('thankYou.delivery')}>
        <div className="space-y-5">
          {summary.shippingAddress && (
            <Field label={t('thankYou.shippingAddress')}>
              <p className="text-text">{summary.shippingAddress.receiverName}</p>
              <p>{summary.shippingAddress.line}</p>
            </Field>
          )}

          <Field label={t('thankYou.shippingSpeed')}>
            <p>
              {summary.shippingFee === 0
                ? t('shipping.free')
                : `${summary.shippingMethodName ?? t('checkout.shipping')} · ${formatPrice(summary.shippingFee)}`}
            </p>
            {summary.estimatedDeliveryAt && (
              <p>{t('thankYou.arrivesBy')} {formatDeliveryDate(summary.estimatedDeliveryAt)}</p>
            )}
          </Field>

          {summary.trackingNumber ? (
            <TrackingCode trackingNumber={summary.trackingNumber} carrier={summary.carrier} />
          ) : (
            <p className="text-sm text-text-muted">{t('shipment.pending')}</p>
          )}
        </div>
      </Section>

      {/* 5: nội dung đơn */}
      <div className="mt-10">
        <Section title={t('thankYou.orderSection')}>
          <div className="divide-y divide-border">
            {summary.items.map((item, i) => (
              <div key={`${item.productName}-${i}`} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-text">{item.productName}</p>
                  <p className="text-sm text-text-muted">
                    {item.variantName ? `${item.variantName} · ` : ''}
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <p className="font-mono text-sm text-text whitespace-nowrap">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>{t('cart.subtotal')}</span><span>{formatPrice(summary.subtotal)}</span>
            </div>
            {summary.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>{t('checkout.discount')}</span><span>−{formatPrice(summary.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-muted">
              <span>{t('checkout.shipping')}</span>
              <span>{summary.shippingFee === 0 ? t('shipping.free') : formatPrice(summary.shippingFee)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border text-base font-semibold text-text">
              <span>{t('checkout.total')}</span><span>{formatPrice(summary.totalAmount)}</span>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {showViewOrder && orderId != null && (
          <Link href={`/orders/${orderId}`}>
            <Button size="sm">{t('checkout.viewOrder')}</Button>
          </Link>
        )}
        <Link href="/products">
          <Button size="sm" variant="outline">{t('cart.continueShopping')}</Button>
        </Link>
      </div>
    </div>
  );
}
