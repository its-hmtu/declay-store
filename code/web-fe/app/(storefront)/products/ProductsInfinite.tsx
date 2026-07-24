'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ProductCard from '@/components/storefront/ProductCard';
import { productsApi } from '@/lib/api';
import type { Product } from '@/lib/types';

const LIMIT = 12;

export type ProductQuery = {
  categoryId?: number;
  collectionId?: number;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
};

export default function ProductsInfinite({
  initialItems,
  total,
  params,
}: {
  initialItems: Product[];
  total: number;
  params: ProductQuery;
}) {
  const [items, setItems]     = useState<Product[]>(initialItems);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const done = items.length >= total;

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    setLoading(true);
    setError(false);
    try {
      const next = page + 1;
      const { data } = await productsApi.list({ ...params, page: next, limit: LIMIT });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, items.length, total, page, params]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!done && (
        <div ref={sentinel} className="py-10 flex justify-center">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-text-muted">
              <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading more…
            </span>
          ) : error ? (
            <button onClick={loadMore} className="text-sm text-brand hover:underline">Couldn&apos;t load — retry</button>
          ) : (
            <span className="h-1" />
          )}
        </div>
      )}

    </>
  );
}
