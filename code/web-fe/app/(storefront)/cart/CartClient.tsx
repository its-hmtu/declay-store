'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { effectivePrice, formatPrice } from '@/lib/utils';
import { auth } from '@/lib/auth';
import { useT } from '@/lib/i18n/LocaleProvider';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/lib/cart/CartProvider';
import RecommendedProducts from '@/components/storefront/RecommendedProducts';
import RecentlyViewed from '@/components/storefront/RecentlyViewed';

export default function CartClient() {
  const { t } = useT();
  // M-20: đọc từ trạng thái giỏ hàng dùng chung. Trước đây trang này giữ bản
  // sao riêng, nên sửa số lượng ở đây thì badge trên Header vẫn hiện số cũ.
  const { cart, loading, updateItem, removeItem: removeCartItem } = useCart();

  async function updateQty(itemId: number, qty: number) {
    try {
      await updateItem(itemId, qty);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function removeItem(itemId: number) {
    try {
      await removeCartItem(itemId);
      toast.success(t('cart.removed'));
    } catch {
      toast.error('Remove failed.');
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <Skeleton className="mx-auto h-6 w-48 mb-4" />
      <div className="space-y-4">
        <div className="flex gap-4 p-4 rounded-xl border border-border bg-surface">
          <Skeleton className="h-20 w-20 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-64 mb-2" />
            <Skeleton className="h-3 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="w-36">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex gap-4 p-4 rounded-xl border border-border bg-surface">
          <Skeleton className="h-20 w-20 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-64 mb-2" />
            <Skeleton className="h-3 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="w-36">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );

  // M-01: no login wall — an empty cart simply shows the empty state below.

  const items   = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => {
    const price = effectivePrice(item.variant?.price, item.variant?.specialPrice, item.variant?.product?.campaignDiscountPercent);
    return sum + price * item.quantity;
  }, 0);

  if (items.length === 0) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <h1 className="font-serif text-3xl font-bold text-text mb-4">{t('cart.title')}</h1>
      <p className="text-text-muted mb-6">{t('cart.empty')}</p>
      <Link href="/products" className="inline-flex items-center px-7 py-3 bg-brand text-white rounded-lg hover:bg-brand-light transition-colors font-medium">
        Shop Now
      </Link>
      <div className="text-left">
        <RecommendedProducts />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-text mb-8">{t('cart.title')}</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Items */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => {
            const variant = item.variant;
            const product = variant?.product;
            const image   = variant?.images?.[0];
            const base    = parseFloat(variant?.price ?? '0');
            const price   = effectivePrice(variant?.price, variant?.specialPrice, product?.campaignDiscountPercent);
            const onSale  = price < base;

            return (
              <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-border bg-surface">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-alt shrink-0">
                  {image ? (
                    <Image src={image} alt={product?.name ?? ''} width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-alt" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{product?.name}</p>
                  <p className="text-sm text-text-muted">{variant?.name}</p>
                  <p className="mt-1 font-semibold">
                    {onSale ? (<><span className="text-error">{formatPrice(price)}</span> <span className="text-text-faint line-through text-sm">{formatPrice(base)}</span></>) : <span className="text-brand">{formatPrice(price)}</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between gap-2">
                  <button onClick={() => removeItem(item.id)} className="text-text-faint hover:text-error transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden text-sm">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-brand disabled:opacity-40 transition-colors">−</button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-brand transition-colors">+</button>
                  </div>
                  <p className="text-sm font-medium text-text">{formatPrice((price * item.quantity))}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="md:col-span-1">
          <div className="sticky top-24 p-6 rounded-xl border border-border bg-surface">
            <h2 className="font-serif text-lg font-semibold text-text mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm text-text-muted">
              <div className="flex justify-between">
                <span>{t('cart.subtotal')}</span>
                <span className="text-text font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between font-semibold text-text">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <Link href="/checkout">
              <Button className="w-full mt-6">Proceed to Checkout</Button>
            </Link>
          </div>
        </div>
      </div>

      <RecommendedProducts
        context="cart"
        productIds={items.map((i) => i.variant?.product?.id).filter((x): x is number => typeof x === 'number')}
      />
      <RecentlyViewed
        excludeIds={items.map((i) => i.variant?.product?.id).filter((x): x is number => typeof x === 'number')}
      />
    </div>
  );
}
