'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { Product, ProductVariant } from '@/lib/types';
import { cartApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import { guestSession } from '@/lib/guest';
import Button from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';
import WishlistButton from '@/components/storefront/WishlistButton';
import ProductReviews from '@/components/storefront/ProductReviews';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/lib/cart/CartProvider';
import { useT } from '@/lib/i18n/LocaleProvider';

export default function ProductDetail({ product }: { product: Product }) {
  const { t } = useT();
  const { addItem } = useCart();
  const variants = product.variants?.filter((v) => v.isActive) ?? [];
  const [selected, setSelected] = useState<ProductVariant | null>(variants[0] ?? null);
  const [qty,      setQty]      = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [imgIdx,   setImgIdx]   = useState(0);

  const isValidSrc = (src: string) => src.startsWith('/') || src.startsWith('http');
  const images = (selected?.images ?? []).filter(isValidSrc);

  async function addToCart() {
    // M-01: guests can add to cart — a guest session is created on first use.
    const token = auth.getToken() ?? undefined;
    if (!token) guestSession.get();
    if (!selected) return;
    setLoading(true);
    try {
      // M-20: thêm qua trạng thái dùng chung -> badge cập nhật ngay và
      // ngăn kéo giỏ hàng tự mở, rút ngắn đường tới thanh toán.
      await addItem(selected.id, qty);
      toast.success(`${product.name} — ${t('cart.added')}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add to cart.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-alt border border-border">
            {images[imgIdx] ? (
              <Image src={images[imgIdx]} alt={product.name} width={600} height={600} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-faint text-sm">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === imgIdx ? 'border-brand' : 'border-border hover:border-brand-lighter'
                  }`}
                >
                  <Image src={src} alt="" width={64} height={64} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <p className="text-sm text-text-muted uppercase tracking-wider mb-2">{product.category.name}</p>
          )}
          <h1 className="font-serif text-4xl font-bold text-text leading-tight">{product.name}</h1>

          {selected && (
            (() => {
              const base = parseFloat(selected.price);
              const special = selected.specialPrice ? parseFloat(selected.specialPrice) : null;
              const campaign = product.campaignDiscountPercent ?? null;
              // Best price for the customer: lowest of special price and active campaign %.
              const cands = [base];
              if (special !== null && special >= 0) cands.push(special);
              if (campaign != null && campaign > 0 && campaign <= 100) cands.push(base * (1 - campaign / 100));
              const best = Math.min(...cands);
              const onSale = best < base;
              return onSale ? (
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-error">{formatPrice(best)}</span>
                  <span className="text-lg text-text-faint line-through">{formatPrice(base)}</span>
                  <span className="text-xs font-bold text-white bg-error rounded px-1.5 py-0.5">-{Math.round((1 - best / base) * 100)}%</span>
                </p>
              ) : (
                <p className="mt-4 text-2xl font-semibold text-brand">{formatPrice(base)}</p>
              );
            })()
          )}

          {product.description && (
            <p className="mt-4 text-text-muted leading-relaxed">{product.description}</p>
          )}

          {/* Variant selector */}
          {variants.length > 1 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-text mb-2">Edition / Size</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelected(v); setImgIdx(0); }}
                    disabled={v.stock === 0}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      selected?.id === v.id
                        ? 'border-brand bg-brand-faint text-brand'
                        : 'border-border text-text-muted hover:border-brand-lighter'
                    }`}
                  >
                    {v.name}
                    {v.stock === 0 && <span className="ml-1 text-xs">(Sold out)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock info */}
          {selected && (
            <p className="mt-3 text-sm text-text-muted">
              {selected.stock > 0 ? `${selected.stock} in stock` : <span className="text-error font-medium">Sold out</span>}
            </p>
          )}

          {/* Qty + Add to cart */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-brand transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center font-medium text-text">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(selected?.stock ?? 1, q + 1))}
                className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-brand transition-colors"
              >
                +
              </button>
            </div>
          </div>
            <Button
              onClick={addToCart}
              loading={loading}
              disabled={!selected || selected.stock === 0}
              className="flex-1 mt-3 w-full"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </Button>

          {/* Wishlist */}
          {selected && (
            <WishlistButton variantId={selected.id} className="mt-3 w-full" />
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} />
      <RelatedProducts product={product} />
    </div>
  );
}
