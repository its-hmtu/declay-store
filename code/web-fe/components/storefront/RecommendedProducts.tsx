'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { recommendationsApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import ProductCard from '@/components/storefront/ProductCard';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Skeleton } from '@/components/ui/skeleton';

type Context = 'cart' | 'detail' | 'post_purchase' | 'home' | 'account';

/**
 * M-35: "Có thể bạn sẽ thích" — gọi hệ gợi ý theo NGỮ CẢNH (giỏ / chi tiết SP /
 * sau đặt hàng / trang chủ). Server đã ghép mua-chung + content + phổ biến, và
 * loại hàng trong giỏ / đã mua / hết hàng, nên FE chỉ việc hiển thị.
 */
export default function RecommendedProducts({
  context = 'home',
  productIds = [],
  limit = 4,
  title,
}: {
  context?: Context;
  productIds?: number[];
  limit?: number;
  title?: string;
}) {
  const { t } = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const idsKey = productIds.join(',');

  useEffect(() => {
    setLoading(true);
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    recommendationsApi.get({ context, productIds: ids, limit }, auth.getToken() ?? undefined)
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, idsKey, limit]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-bold text-text mb-5">{title ?? t('cart.recommended')}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.slice(0, limit).map((p) => (
            <div
              key={p.id}
              onClickCapture={() =>
                recommendationsApi.recordClick(p.id, context, auth.getToken() ?? undefined).catch(() => undefined)
              }
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
