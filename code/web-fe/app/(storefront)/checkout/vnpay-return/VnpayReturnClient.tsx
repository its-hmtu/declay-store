'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';
import Button from '@/components/ui/Button';
import OrderThankYou from '@/components/storefront/OrderThankYou';

type Result = 'checking' | 'paid' | 'awaiting' | 'failed' | 'invalid';
type Summary = NonNullable<Awaited<ReturnType<typeof ordersApi.verifyVnpayReturn>>['data']['summary']>;

/**
 * M-12/M-17: VNPay đưa khách quay lại đây.
 *
 * Trang này KHÔNG tự kết luận "đã thanh toán" từ tham số trên URL. Nó gọi API
 * để máy chủ kiểm lại chữ ký và ghi nhận đơn (lưới an toàn khi IPN chưa tới),
 * rồi hiển thị TRẠNG THÁI THẬT của đơn trong cơ sở dữ liệu.
 *
 * Với khách vãng lai đây là màn hình duy nhất họ thấy nội dung đơn — không có
 * tài khoản thì không vào được trang lịch sử đơn. Vì vậy phải hiện đủ sản phẩm,
 * số tiền và mã vận đơn ngay tại đây.
 */
export default function VnpayReturnClient() {
  const { t } = useT();
  const params = useSearchParams();
  const [result, setResult] = useState<Result>('checking');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attempt, setAttempt] = useState(0);

  const check = useCallback(async () => {
    const query = params.toString();
    if (!query) { setResult('invalid'); return; }
    try {
      const { data } = await ordersApi.verifyVnpayReturn(`?${query}`);
      setOrderId(data.orderId);
      setOrderCode(data.orderCode);
      setSummary(data.summary ?? null);
      if (!data.valid) { setResult('invalid'); return; }
      if (data.paid) { setResult('paid'); return; }
      // Chữ ký hợp lệ, cổng báo thành công, nhưng đơn chưa chuyển trạng thái.
      setResult(data.responseCode === '00' ? 'awaiting' : 'failed');
    } catch {
      setResult('invalid');
    }
  }, [params]);

  useEffect(() => { check(); }, [check, attempt]);

  // Tự thử lại tối đa 3 lần trong ~9 giây để chờ IPN về, rồi dừng —
  // không để trang quay vòng vô hạn làm nặng máy chủ.
  useEffect(() => {
    if (result !== 'awaiting' || attempt >= 3) return;
    const timer = setTimeout(() => setAttempt((n) => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [result, attempt]);

  const view = {
    checking: { icon: <Loader2 size={40} className="animate-spin text-text-muted" />, text: t('checkout.vnpayVerifying') },
    paid:     { icon: <CheckCircle2 size={40} className="text-success" />,            text: t('checkout.vnpaySuccess') },
    awaiting: { icon: <Clock size={40} className="text-accent" />,                    text: t('checkout.vnpayPendingConfirm') },
    failed:   { icon: <XCircle size={40} className="text-error" />,                   text: t('checkout.vnpayFailed') },
    invalid:  { icon: <XCircle size={40} className="text-error" />,                   text: t('checkout.vnpayInvalid') },
  }[result];

  // Thanh toán xong thì dùng CHUNG trang cảm ơn với luồng COD — hai màn hình
  // không được phép hiển thị khác nhau cho cùng một sự kiện "đặt hàng thành công".
  if (result === 'paid' && summary) {
    return (
      <OrderThankYou
        summary={summary}
        // Khách vãng lai không mở được /orders/:id — nút đó chỉ dẫn tới trang lỗi.
        showViewOrder={summary.isGuest === false}
        orderId={orderId}
      />
    );
  }

  // Các trạng thái còn lại (đang đối soát / thất bại / chữ ký sai) là màn hình
  // trạng thái thanh toán, không phải trang cảm ơn.
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center">
      <div className="flex justify-center mb-5">{view.icon}</div>
      <h1 className="font-serif text-2xl font-bold text-text leading-snug">{view.text}</h1>
      {(orderCode || orderId) && (
        <p className="mt-2 font-mono text-sm text-text-muted">{orderCode ?? `#${orderId}`}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {result === 'awaiting' && (
          <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t('checkout.vnpayRetry')}
          </Button>
        )}
        <Link href="/products">
          <Button size="sm" variant="outline">{t('cart.continueShopping')}</Button>
        </Link>
      </div>
    </div>
  );
}
