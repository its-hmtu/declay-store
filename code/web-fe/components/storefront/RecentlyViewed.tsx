'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { recommendationsApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import ProductCard from '@/components/storefront/ProductCard';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * "Bạn vừa mới xem" — hiển thị song song với "Có thể bạn sẽ thích".
 * Lấy từ product_view_events của chính khách (user hoặc guest), còn hàng, mới nhất
 * trước; loại các id truyền vào (vd sản phẩm đang xem / đang trong giỏ).
 */
export default function RecentlyViewed({
  limit = 4,
  excludeIds = [],
  title,
}: {
  limit?: number;
  excludeIds?: number[];
  title?: string;
}) {
  const { t } = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const idsKey = excludeIds.join(',');

  useEffect(() => {
    setLoading(true);
    const exclude = idsKey ? idsKey.split(',').map(Number) : [];
    recommendationsApi.recentlyViewed({ limit, excludeIds: exclude }, auth.getToken() ?? undefined)
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, limit]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-bold text-text mb-5">{title ?? t('recentlyViewed.title')}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.slice(0, limit).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
