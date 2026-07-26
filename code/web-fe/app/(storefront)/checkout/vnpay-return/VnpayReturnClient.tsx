'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';
import Button from '@/components/ui/Button';

type Result = 'checking' | 'paid' | 'awaiting' | 'failed' | 'invalid';

/**
 * M-12: VNPay đưa khách quay lại đây.
 *
 * Trang này KHÔNG tự kết luận "đã thanh toán" từ tham số trên URL. Nó gọi API
 * để máy chủ kiểm lại chữ ký và ghi nhận đơn (lưới an toàn khi IPN chưa tới),
 * rồi hiển thị TRẠNG THÁI THẬT của đơn trong cơ sở dữ liệu.
 *
 * Nếu VNPay báo thành công nhưng đơn vẫn `pending_payment` — tức việc ghi nhận
 * chưa xong — hiển thị "đang đối soát" và tự thử lại vài lần, thay vì báo thành
 * công dối hoặc báo thất bại oan.
 */
export default function VnpayReturnClient() {
  const { t } = useT();
  const params = useSearchParams();
  const [result, setResult] = useState<Result>('checking');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  const check = useCallback(async () => {
    const query = params.toString();
    if (!query) { setResult('invalid'); return; }
    try {
      const { data } = await ordersApi.verifyVnpayReturn(`?${query}`);
      setOrderId(data.orderId);
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

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center">
      <div className="flex justify-center mb-5">{view.icon}</div>
      <h1 className="font-serif text-2xl font-bold text-text leading-snug">{view.text}</h1>
      {orderId && <p className="mt-2 font-mono text-sm text-text-muted">#{orderId}</p>}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {result === 'awaiting' && (
          <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t('checkout.vnpayRetry')}
          </Button>
        )}
        {orderId && (
          <Link href={`/orders/${orderId}`}>
            <Button size="sm">{t('checkout.viewOrder')}</Button>
          </Link>
        )}
        <Link href="/shop">
          <Button size="sm" variant="outline">{t('cart.continueShopping')}</Button>
        </Link>
      </div>
    </div>
  );
}
