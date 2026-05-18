import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const variant   = product.variants?.[0];
  const image     = variant?.images?.[0];
  const price     = variant ? parseFloat(variant.price) : null;
  const inStock   = product.variants?.some((v) => v.isActive && v.stock > 0);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-xl overflow-hidden border border-border bg-surface hover:border-brand-lighter transition-colors"
    >
      <div className="aspect-square bg-surface-alt overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-faint text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        {product.category && (
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            {product.category.name}
          </p>
        )}
        <h3 className="font-serif font-semibold text-text group-hover:text-brand transition-colors line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          {price !== null ? (
            <p className="font-medium text-brand">
              ${price.toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-text-muted">—</p>
          )}
          {!inStock && (
            <span className="text-xs text-error font-medium">Sold out</span>
          )}
        </div>
      </div>
    </Link>
  );
}
