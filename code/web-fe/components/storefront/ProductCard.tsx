'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useT } from '@/lib/i18n/LocaleProvider';
import { formatPrice, pricingOf } from '@/lib/utils';
import { badgeFor } from '@/lib/campaign-display';

export default function ProductCard({ product }: { product: Product }) {
  const { t } = useT();
  const variant   = product.variants?.[0];
  const image     = variant?.images?.[0];
  // M-40: the server decided this price. We only render it.
  const pricing   = variant ? pricingOf(variant, product.campaignDiscountPercent) : null;
  const base      = pricing?.basePrice ?? null;
  const price     = pricing?.effectivePrice ?? null;
  const onSale    = pricing?.onSale ?? false;
  const percentOff = pricing?.discountPercent ?? 0;
  // M-44: name the campaign when it is what set the price. `source` comes from
  // the server — the card must not guess why a price is reduced.
  const badge     = badgeFor(pricing?.source, percentOff, product.campaignName);
  const inStock   = product.variants?.some((v) => v.isActive && v.stock > 0);
  const rating    = product.rating;
  const sold      = product.salesCount ?? 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-square card-flat bg-surface-alt overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            width={500}
            height={500}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-sans text-xs text-text-faint">
            No image
          </div>
        )}
      </div>

      <div className="pt-3">
        {!inStock ? (
          <p className="badge-status mb-1">{t('product.soldOut')}</p>
        ) : sold > 0 ? (
          <p className="badge-status mb-1">{t('product.bestseller')}</p>
        ) : null}
        <h3 className="font-sans font-medium text-text leading-snug group-hover:underline decoration-1 underline-offset-2 line-clamp-2">
          {product.name}
        </h3>
        {product.category && (
          <p className="font-sans text-sm text-text-muted mt-0.5">{product.category.name}</p>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          {price !== null ? (
            onSale ? (
              <p className="font-sans text-sm flex items-baseline gap-1.5">
                <span className="text-text font-medium">{formatPrice(price)}</span>
                <span className="price-original">{formatPrice((base as number))}</span>
                {badge && (
                  <span className={badge.kind === 'campaign' ? 'price-discount font-semibold' : 'price-discount'}>
                    {badge.text}
                  </span>
                )}
              </p>
            ) : (
              <p className="font-sans text-sm text-text">{formatPrice(price)}</p>
            )
          ) : (
            <p className="font-sans text-sm text-text-faint">&mdash;</p>
          )}
        </div>

        {/* Evaluation metrics: rating + units sold */}
        {(rating && rating.count > 0) || sold > 0 ? (
          <div className="mt-1 flex items-center gap-2.5 font-sans text-xs text-text-muted">
            {rating && rating.count > 0 && (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-accent text-accent" />
                {rating.average.toFixed(1)}
                {/* <span className="text-text-faint">({rating.count})</span> */}
              </span>
            )}
            {/* {sold > 0 && (
              <span className="text-text-faint">{t('product.sold', { count: sold })}</span>
            )} */}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
