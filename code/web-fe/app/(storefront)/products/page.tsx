import type { Metadata } from 'next';
import { productsApi, categoriesApi } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';
import ProductFilters from './ProductFilters';

export const metadata: Metadata = { title: 'Shop All Products' };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp         = await searchParams;
  const page       = Number(sp.page    || '1');
  const categoryId = sp.categoryId ? Number(sp.categoryId) : undefined;
  const search     = sp.search;

  const [productsRes, categoriesRes] = await Promise.allSettled([
    productsApi.list({ page, limit: 12, categoryId, search }),
    categoriesApi.list(),
  ]);

  const products   = productsRes.status   === 'fulfilled' ? productsRes.value.data   : [];
  const meta       = productsRes.status   === 'fulfilled' ? productsRes.value.meta   : undefined;
  const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-4xl font-bold text-text mb-8">Shop</h1>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden md:block w-56 shrink-0">
          <ProductFilters categories={categories} selected={categoryId} search={search} />
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="py-24 text-center text-text-muted">
              <p className="text-lg">No products found.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted mb-4">
                {meta ? `${meta.total} product${meta.total !== 1 ? 's' : ''}` : `${products.length} products`}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                    <a
                      key={p}
                      href={`/products?page=${p}${categoryId ? `&categoryId=${categoryId}` : ''}${search ? `&search=${search}` : ''}`}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors ${
                        p === page
                          ? 'bg-brand text-white border-brand'
                          : 'border-border text-text-muted hover:border-brand hover:text-brand'
                      }`}
                    >
                      {p}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
