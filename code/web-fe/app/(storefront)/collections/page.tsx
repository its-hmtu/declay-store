import type { Metadata } from 'next';
import { collectionsApi } from '@/lib/api';
import CollectionCarousel from '@/components/storefront/CollectionCarousel';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Collections' };

/**
 * M-46: the collections index.
 *
 * Previously a grid of text-only cards — a customer had to click through and hope
 * before seeing a single product. Now each collection shows its actual pieces, so
 * the page sells on its own and a click is a decision, not a gamble. Same
 * component as the home page, so the two can never drift apart.
 */
export default async function CollectionsPage() {
  const { t } = await getServerLocale();

  // Collections with nothing visible to show are dropped server-side.
  const res = await collectionsApi.listWithProducts(8).catch(() => null);
  const collections = res?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-sans text-3xl font-bold text-text">{t('collection.exploreTitle')}</h1>
      <p className="mt-2 text-text-muted">{t('collection.exploreSubtitle')}</p>

      {collections.length === 0 ? (
        <p className="py-24 text-center text-text-muted">{t('collection.empty')}</p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {collections.map((collection, i) => (
            <CollectionCarousel key={collection.id} collection={collection} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
