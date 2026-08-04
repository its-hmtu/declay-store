import type { Metadata } from 'next';
import { productsApi, categoriesApi, collectionsApi } from '@/lib/api';
import ProductFilters from './ProductFilters';
import ProductSort from './ProductSort';
import ProductsInfinite, { type ProductQuery } from './ProductsInfinite';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Shop All Products' };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { t } = await getServerLocale();
  const sp           = await searchParams;
  const categoryId   = sp.categoryId ? Number(sp.categoryId) : undefined;
  const collectionId = sp.collectionId ? Number(sp.collectionId) : undefined;
  const minPrice     = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice     = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const search       = sp.search;
  const sort         = sp.sort;

  const query: ProductQuery = { categoryId, collectionId, minPrice, maxPrice, search, sort };

  const [productsRes, categoriesRes, collectionsRes] = await Promise.allSettled([
    productsApi.list({ ...query, page: 1, limit: 12 }),
    categoriesApi.list(),
    collectionsApi.list(),
  ]);

  const products    = productsRes.status   === 'fulfilled' ? productsRes.value.data   : [];
  const meta        = productsRes.status   === 'fulfilled' ? productsRes.value.meta   : undefined;
  const categories  = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [];
  const collections = collectionsRes.status === 'fulfilled' ? collectionsRes.value.data : [];
  const total       = meta?.total ?? products.length;

  // Reset the infinite list whenever the active filters change.
  const resetKey = JSON.stringify(query);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-sans text-3xl font-bold text-text mb-8">{t('shop.title')}</h1>

      <div className="flex gap-8 items-start">
        {/* Sidebar filters (sticky) */}
        <aside className="hidden md:block w-60 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <ProductFilters
            categories={categories}
            collections={collections}
            selected={categoryId}
            selectedCollection={collectionId}
            search={search}
          />
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Sticky toolbar */}
          <div className="sticky top-24 z-30 -mt-2 mb-4 bg-surface/95 backdrop-blur py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              {t('shop.productCount', { count: total })}
            </p>
            <ProductSort value={sort} />
          </div>

          {products.length === 0 ? (
            <div className="py-24 text-center text-text-muted">
              <p className="text-lg">{t('shop.noProducts')}</p>
            </div>
          ) : (
            <ProductsInfinite key={resetKey} initialItems={products} total={total} params={query} />
          )}
        </div>
      </div>
    </div>
  );
}
