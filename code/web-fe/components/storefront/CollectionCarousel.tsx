'use client';

/**
 * M-46: a collection shown as "cover image + name + a row of its products".
 *
 * Thin wrapper over ProductRow (M-47) — the only thing specific to a collection
 * is the cover image above the heading. Everything else about how a row of
 * products looks and scrolls lives in one place.
 *
 * The description is deliberately NOT shown here: it belongs on the collection's
 * own page, where the customer has committed to browsing. In a row it competes
 * with the products and pushes them below the fold.
 */

import Link from 'next/link';
import Image from 'next/image';
import type { Collection } from '@/lib/types';
import ProductRow from '@/components/storefront/ProductRow';

export default function CollectionCarousel({
  collection,
  priority = false,
}: {
  collection: Collection;
  /** True for the first row on a page — lets its cover image load eagerly. */
  priority?: boolean;
}) {
  const href = `/collections/${collection.slug}`;

  return (
    <ProductRow title={collection.name} href={href} products={collection.products ?? []}>
      {collection.imageUrl && (
        <Link href={href} className="group mb-5 block overflow-hidden rounded-2xl">
          <div className="relative aspect-[21/9] md:aspect-[3/1] bg-surface-alt">
            <Image
              src={collection.imageUrl}
              alt={collection.name}
              fill
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(min-width: 1280px) 1280px, 100vw"
            />
          </div>
        </Link>
      )}
    </ProductRow>
  );
}
