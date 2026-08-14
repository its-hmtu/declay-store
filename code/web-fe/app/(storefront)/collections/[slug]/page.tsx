import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { productsApi, categoriesApi, collectionsApi } from '@/lib/api';
import ProductFilters from '../../products/ProductFilters';
import ProductSort from '../../products/ProductSort';
import ProductsInfinite, { type ProductQuery } from '../../products/ProductsInfinite';
import { getServerLocale } from '@/lib/i18n/server';

/**
 * M-45: a collection is a "big filter" over the shop — think Nike's Air Force 1
 * series page. It is the SAME shop experience (sidebar filters, sort, infinite
 * scroll, identical product cards) with the title swapped for the collection name
 * and the result set locked to that collection.
 *
 * Rebuilding a parallel grid here was the old mistake: the collection page served
 * a bare list with no filters, no sort and no pagination, so a customer who
 * arrived from a collection link got a visibly worse shop than one who arrived
 * from /products. Reusing the same three components keeps them from drifting.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await collectionsApi.detail(slug).catch(() => null);
  const collection = res?.data;
  return {
    title: collection?.name ?? 'Collection',
    description: collection?.description ?? undefined,
    // M-46: collection links get shared on social; without this they preview as a
    // blank card, which is a poor first impression for a shop whose traffic
    // arrives from Facebook, Instagram and TikTok.
    openGraph: collection?.imageUrl
      ? {
          title: collection.name,
          description: collection.description ?? undefined,
          images: [{ url: collection.imageUrl }],
        }
      : undefined,
  };
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { t } = await getServerLocale();
  const { slug } = await params;
  const sp = await searchParams;

  // Resolve the collection first — its id is what scopes every product query below.
  const collectionRes = await collectionsApi.detail(slug).catch(() => null);
  const collection = collectionRes?.data;
  if (!collection) notFound();

  const categoryId = sp.categoryId ? Number(sp.categoryId) : undefined;
  const minPrice   = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice   = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const search     = sp.search;
  const sort       = sp.sort;

  // collectionId is fixed by the route, never by the query string — a visitor
  // cannot widen the page beyond the collection they navigated into.
  const query: ProductQuery = {
    collectionId: collection.id,
    categoryId,
    minPrice,
    maxPrice,
    search,
    sort,
  };

  const [productsRes, categoriesRes] = await Promise.allSettled([
    productsApi.list({ ...query, page: 1, limit: 12 }),
    categoriesApi.list(),
  ]);

  const products   = productsRes.status === 'fulfilled' ? productsRes.value.data : [];
  const meta       = productsRes.status === 'fulfilled' ? productsRes.value.meta : undefined;
  const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [];
  const total      = meta?.total ?? products.length;

  const basePath = `/collections/${slug}`;
  const resetKey = JSON.stringify(query);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <nav className="mb-3 text-sm text-text-muted">
        <Link href="/products" className="hover:text-text transition-colors">{t('shop.title')}</Link>
        <span className="mx-2">/</span>
        <span className="text-text">{collection.name}</span>
      </nav>

      {collection.imageUrl && (
        <div className="relative mb-6 aspect-[21/9] md:aspect-[4/1] overflow-hidden rounded-2xl bg-surface-alt">
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1280px) 1280px, 100vw"
          />
        </div>
      )}

      {/* The only visible difference from /products: the title is the collection. */}
      <h1 className="font-sans text-3xl font-bold text-text">{collection.name}</h1>
      {collection.description && (
        <p className="mt-2 max-w-2xl text-text-muted">{collection.description}</p>
      )}

      <div className="mt-8 flex gap-8 items-start">
        <aside className="hidden md:block w-60 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          {/* collections=[] hides the collection filter — we are already inside one. */}
          <ProductFilters
            categories={categories}
            collections={[]}
            selected={categoryId}
            search={search}
            basePath={basePath}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="sticky top-24 z-30 -mt-2 mb-4 bg-surface/95 backdrop-blur py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-text-muted">{t('shop.productCount', { count: total })}</p>
            <ProductSort value={sort} basePath={basePath} />
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
