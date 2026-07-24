import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const variant   = product.variants?.[0];
  const image     = variant?.images?.[0];
  const base      = variant ? parseFloat(variant.price) : null;
  const special   = variant?.specialPrice ? parseFloat(variant.specialPrice) : null;
  const campaign  = product.campaignDiscountPercent ?? null;
  // Best price for the customer: lowest of special price and active campaign %.
  let best = base;
  if (best !== null) {
    if (special !== null && special >= 0 && special < best) best = special;
    if (campaign != null && campaign > 0 && campaign <= 100) {
      const cp = (base as number) * (1 - campaign / 100);
      if (cp < best) best = cp;
    }
  }
  const onSale     = base !== null && best !== null && best < base;
  const price      = onSale ? best : base;
  const percentOff = onSale ? Math.round((1 - (best as number) / (base as number)) * 100) : 0;
  const inStock   = product.variants?.some((v) => v.isActive && v.stock > 0);
  const rating    = product.rating;
  const sold      = product.salesCount ?? 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-square rounded-xl bg-surface-alt overflow-hidden border border-border">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            width={500}
            height={500}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-faint">
            No image
          </div>
        )}
      </div>

      <div className="pt-3">
        {product.category && (
          <p className="eyebrow mb-1">{product.category.name}</p>
        )}
        <h3 className="font-sans font-semibold text-text leading-snug group-hover:underline decoration-1 underline-offset-2 line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center justify-between">
          {price !== null ? (
            onSale ? (
              <p className="font-mono text-sm flex items-baseline gap-1.5">
                <span className="text-error font-semibold">${price.toFixed(2)}</span>
                <span className="text-text-faint line-through">${(base as number).toFixed(2)}</span>
                <span className="text-[10px] font-bold text-white bg-error rounded px-1 py-0.5">-{percentOff}%</span>
              </p>
            ) : (
              <p className="font-mono text-sm text-text">${price.toFixed(2)}</p>
            )
          ) : (
            <p className="font-mono text-sm text-text-faint">&mdash;</p>
          )}
          {!inStock && (
            <span className="font-mono text-xs text-error">Sold out</span>
          )}
        </div>

        {/* Evaluation metrics: rating + units sold */}
        {(rating && rating.count > 0) || sold > 0 ? (
          <div className="mt-1 flex items-center gap-2.5 font-mono text-xs text-text-muted">
            {rating && rating.count > 0 && (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-accent text-accent" />
                {rating.average.toFixed(1)}
                <span className="text-text-faint">({rating.count})</span>
              </span>
            )}
            {sold > 0 && (
              <span className="text-text-faint">{sold} sold</span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
