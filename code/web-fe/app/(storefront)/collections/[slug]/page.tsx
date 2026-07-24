import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { collectionsApi } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await collectionsApi.detail(slug).catch(() => null);
  return { title: res?.data?.name ?? 'Collection' };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await collectionsApi.detail(slug).catch(() => null);
  const collection = res?.data;
  if (!collection) notFound();

  const products = collection.products ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">{collection.name}</h1>
      {collection.description && <p className="text-text-muted mb-8 max-w-2xl">{collection.description}</p>}

      {products.length === 0 ? (
        <p className="text-text-muted">No products in this collection yet.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
