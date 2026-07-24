'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { productsApi } from '@/lib/api';
import ProductCard from './ProductCard';

/** Shows a few other products from the same category. */
export default function RelatedProducts({ product }: { product: Product }) {
  const [items, setItems] = useState<Product[]>([]);
  const categoryId = product.categoryId ?? product.category?.id;

  useEffect(() => {
    if (!categoryId) return;
    productsApi
      .list({ categoryId, limit: 8 })
      .then((res) => setItems(res.data.filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => undefined);
  }, [categoryId, product.id]);

  if (items.length === 0) return null;

  return (
    <div className="mt-16 pt-10 border-t border-border">
      <h2 className="font-serif text-2xl font-bold text-text mb-6">You might also like</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
