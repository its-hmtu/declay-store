'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { recommendationsApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import ProductCard from './ProductCard';
import { useT } from '@/lib/i18n/LocaleProvider';

/**
 * M-35: "Có thể bạn sẽ thích" ở trang chi tiết SP — dùng hệ gợi ý (context=detail):
 * mua-chung với sản phẩm đang xem → cùng danh mục → phổ biến, đã loại hàng đã
 * mua/hết hàng ở server.
 */
export default function RelatedProducts({ product }: { product: Product }) {
  const { t } = useT();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    recommendationsApi.get({ context: 'detail', productIds: [product.id], limit: 4 }, auth.getToken() ?? undefined)
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, [product.id]);

  if (items.length === 0) return null;

  return (
    <div className="mt-16 pt-10 border-t border-border">
      <h2 className="font-serif text-2xl font-bold text-text mb-6">{t('cart.recommended')}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((p) => (
          <div
            key={p.id}
            onClickCapture={() =>
              recommendationsApi.recordClick(p.id, 'detail', auth.getToken() ?? undefined).catch(() => undefined)
            }
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
