import type { Metadata } from 'next';
import Link from 'next/link';
import { collectionsApi } from '@/lib/api';

export const metadata: Metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  const res = await collectionsApi.list().catch(() => null);
  const collections = res?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">Collections</h1>
      <p className="text-text-muted mb-8">Curated groups of handmade pieces.</p>

      {collections.length === 0 ? (
        <p className="text-text-muted">No collections yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="group block rounded-2xl border border-border bg-linear-to-br from-brand-faint to-surface-alt p-6 hover:border-brand-lighter transition-colors"
            >
              <p className="eyebrow mb-2">{c.productCount ?? 0} items</p>
              <h2 className="font-serif text-2xl font-bold text-text group-hover:text-brand transition-colors">{c.name}</h2>
              {c.description && <p className="mt-2 text-sm text-text-muted line-clamp-2">{c.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
