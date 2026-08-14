'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ordersApi } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';
import Button from '@/components/ui/Button';
import OrderThankYou, { type ThankYouSummary } from '@/components/storefront/OrderThankYou';

/**
 * M-19: trang cảm ơn cho luồng COD.
 *
 * Tra nội dung đơn bằng `guestToken` trong URL — token là chuỗi ngẫu nhiên
 * 48 ký tự, đóng vai trò giấy thông hành. Cố ý KHÔNG tra bằng mã đơn hàng:
 * mã đơn ngắn và có quy luật ngày tháng nên đoán được, dùng nó để tra sẽ cho
 * phép người lạ đọc đơn của khách khác.
 */
export default function ThankYouClient() {
  const { t } = useT();
  const params = useSearchParams();
  const token = params.get('token');
  const fallbackCode = params.get('code');

  const [summary, setSummary] = useState<ThankYouSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    ordersApi
      .guestSummary(token)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <Skeleton className="mx-auto h-12 w-48 mb-4" />
        <Skeleton className="mx-auto h-6 w-64" />
      </div>
    );
  }

  if (summary) return <OrderThankYou summary={summary} />;

  // Không có token (link cũ) hoặc không tra được đơn: vẫn xác nhận đặt hàng
  // thành công thay vì để khách hoang mang, nhưng không bịa ra nội dung đơn.
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
      <CheckCircle size={44} className="mx-auto text-success" />
      <h1 className="font-serif text-3xl font-bold text-text mt-4">{t('thankYou.title')}</h1>
      {fallbackCode && (
        <p className="mt-2 font-mono text-sm text-text-muted">
          {t('thankYou.yourOrder')} {fallbackCode}
        </p>
      )}
      <p className="mt-4 text-text-muted">{t('thankYou.checkEmail')}</p>
      <Link href="/products">
        <Button className="mt-8">{t('cart.continueShopping')}</Button>
      </Link>
    </div>
  );
}
