'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { Product, ProductVariant } from '@/lib/types';
import { cartApi, recommendationsApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import { guestSession } from '@/lib/guest';
import Button from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';
import WishlistButton from '@/components/storefront/WishlistButton';
import ProductReviews from '@/components/storefront/ProductReviews';
import Badge from '@/components/ui/Badge';
import {Separator} from '@/components/ui/separator';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import RecentlyViewed from '@/components/storefront/RecentlyViewed';
import { formatPrice, pricingOf } from '@/lib/utils';
import CampaignRibbon from '@/components/storefront/CampaignRibbon';
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

  // M-35: ghi sự kiện xem sản phẩm (phục vụ gợi ý theo hành vi). Fire-and-forget.
  useEffect(() => {
    recommendationsApi.recordView(product.id, auth.getToken() ?? undefined).catch(() => undefined);
  }, [product.id]);

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
      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Images — vertical thumbnail rail + main image, Nike PDP style */}
        <div className="flex gap-3">
          {images.length > 1 && (
            <div className="hidden sm:flex flex-col gap-2 shrink-0">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 card-flat overflow-hidden border transition-colors ${
                    i === imgIdx ? 'border-brand' : 'border-border hover:border-brand-lighter'
                  }`}
                >
                  <Image src={src} alt="" width={64} height={64} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
          <div className="flex-1">
            <div className="aspect-square card-flat overflow-hidden bg-surface-alt">
              {images[imgIdx] ? (
                <Image src={images[imgIdx]} alt={product.name} width={600} height={600} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-faint text-sm">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="sm:hidden mt-3 flex gap-2">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 card-flat overflow-hidden border transition-colors ${
                      i === imgIdx ? 'border-brand' : 'border-border hover:border-brand-lighter'
                    }`}
                  >
                    <Image src={src} alt="" width={64} height={64} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info — sticky panel, Nike PDP style */}
        <div className="md:sticky md:top-24">
          {product.category && (
            <p className="font-sans text-sm font-semibold text-accent uppercase tracking-wide mb-2">{product.category.name}</p>
          )}
          <h1 className="font-sans text-3xl font-bold text-text leading-tight">{product.name}</h1>

          {selected && (
            (() => {
              // M-40: server-computed pricing — no rule duplicated here.
              const { basePrice, effectivePrice: best, discountPercent, onSale } =
                pricingOf(selected, product.campaignDiscountPercent);
              return onSale ? (
                <div className="mt-4">
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-text">{formatPrice(best)}</span>
                    <span className="text-lg price-original">{formatPrice(basePrice)}</span>
                    <span className="text-sm price-discount font-semibold">-{discountPercent}%</span>
                  </p>
                  <StockInfo selected={selected} />
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-2xl font-semibold text-text">{formatPrice(basePrice)}</p>
                  <StockInfo selected={selected} />
                </div>
              );
            })()
          )}

          {/* M-44: urgency where it converts — the customer is already deciding. */}
          <CampaignRibbon
            campaignId={product.campaignId}
            campaignName={product.campaignName}
            campaignEndsAt={product.campaignEndsAt}
          />

          {/* Description moved to tabbed section below (see Tabs after grid) */}

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
                    className={`px-4 py-2 border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      selected?.id === v.id
                        ? 'border-brand text-brand'
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

          {/* old stock info removed; now shown under price via StockInfo component */}

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
              pill
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

      {/* Tabs: Description / Specifications */}
      <div className="max-w-full mx-auto mt-8">
        <Tabs product={product} selected={selected} />
      </div>

      <Separator className="my-6" />
      <ProductReviews productId={product.id} />
      <RelatedProducts product={product} />
      <RecentlyViewed excludeIds={[product.id]} />
    </div>
  );
}

function Tabs({ product, selected }: { product: Product; selected: ProductVariant | null }) {
  const [tab, setTab] = useState<'description' | 'specs'>('description');

  function renderSpecs() {
    const v = selected;
    if (!v) {
      return <p className="text-sm text-text-muted">No specifications available.</p>;
    }

    const rows: { label: string; value: string }[] = [];
    if (v.weightGram != null) rows.push({ label: 'Weight', value: `${v.weightGram} g` });
    if (v.lengthCm != null || v.widthCm != null || v.heightCm != null) {
      const parts: string[] = [];
      if (v.lengthCm != null) parts.push(`${v.lengthCm} ×`);
      if (v.widthCm != null) parts.push(`${v.widthCm} ×`);
      if (v.heightCm != null) parts.push(`${v.heightCm} cm`);
      rows.push({ label: 'Dimensions', value: parts.join(' ') });
    }

    if (rows.length === 0) {
      return <p className="text-sm text-text-muted">No specifications provided for this variant.</p>;
    }

    return (
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border">
              <td className="py-2 pr-4 font-medium text-text-muted w-40">{r.label}</td>
              <td className="py-2 text-text">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="w-full border border-border rounded-xl bg-surface p-4">
      <div className="flex items-center gap-3 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setTab('description')}
          className={`px-3 py-1 text-sm ${tab === 'description' ? 'font-semibold text-text' : 'text-text-muted'}`}
        >
          Description
        </button>
        <button
          type="button"
          onClick={() => setTab('specs')}
          className={`px-3 py-1 text-sm ${tab === 'specs' ? 'font-semibold text-text' : 'text-text-muted'}`}
        >
          Specifications
        </button>
      </div>

      <div className="mt-4">
        {tab === 'description' ? (
          product.description ? (
            <div className="text-sm text-text-muted leading-relaxed">{product.description}</div>
          ) : (
            <p className="text-sm text-text-muted">No description available.</p>
          )
        ) : (
          renderSpecs()
        )}
      </div>
    </div>
  );
}

function StockInfo({ selected }: { selected: ProductVariant }) {
  if (!selected) return null;
  const stock = selected.stock ?? 0;
  if (stock <= 0) {
    return (
      <p className="mt-2 text-sm">
        <Badge variant="error">Sold out</Badge>
      </p>
    );
  }
  if (stock < 10) {
    return <p className="mt-2 text-sm text-error font-semibold">Just a few left. Order soon.</p>;
  }
  return <p className="mt-2 text-sm text-text-muted">In stock</p>;
}
