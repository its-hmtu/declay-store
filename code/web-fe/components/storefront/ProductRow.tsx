'use client';

/**
 * M-47: one horizontal row of products under a heading.
 *
 * Extracted from CollectionCarousel once the home page grew several of these
 * (new arrivals, best sellers, trending, per-category, per-collection). A single
 * component means every row scrolls, wraps and breaks at the same widths — five
 * near-copies would drift within a month.
 *
 * ProductCard is used verbatim so a product looks identical in every row, in the
 * shop grid and on a collection page, campaign badge included.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/storefront/ProductCard';
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
} from '@/components/ui/carousel';
import { useT } from '@/lib/i18n/LocaleProvider';

export default function ProductRow({
  title,
  href,
  products,
  viewAllLabel,
  children,
}: {
  title: string;
  /** Where the heading and "view all" point. */
  href: string;
  products: Product[];
  viewAllLabel?: string;
  /** Optional slot above the heading — the collection cover image uses it. */
  children?: React.ReactNode;
}) {
  const { t } = useT();

  // A heading with nothing under it reads as a broken page, not an empty shelf.
  if (products.length === 0) return null;

  return (
    <section className="py-10">
      {children}

      <div className="mb-5 flex items-end justify-between gap-4">
        <Link href={href} className="group min-w-0">
          <h2 className="text-2xl md:text-3xl font-display text-text group-hover:underline decoration-1 underline-offset-4">
            {title}
          </h2>
        </Link>

        <Link
          href={href}
          className="shrink-0 font-mono text-sm text-text-muted hover:text-text inline-flex items-center gap-1"
        >
          {viewAllLabel ?? t('collection.viewAll')}
          <ArrowRight size={14} />
        </Link>
      </div>

      <Carousel opts={{ align: 'start', loop: false }} className="relative">
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              // Two per screen on mobile matches the shop grid density.
              className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Arrows on pointer devices only — on touch, swiping is the obvious
            gesture and overlaid buttons just cover the artwork. */}
        <CarouselPrevious className="hidden md:flex -left-14" />
        <CarouselNext className="hidden md:flex -right-14" />
      </Carousel>
    </section>
  );
}
