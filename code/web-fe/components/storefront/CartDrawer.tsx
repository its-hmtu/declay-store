'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cart/CartProvider';
import { useT } from '@/lib/i18n/LocaleProvider';
import { effectivePrice, formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';

/**
 * M-20: ngăn kéo giỏ hàng trượt từ bên phải khi khách thêm sản phẩm.
 *
 * Mục đích là rút ngắn đường tới thanh toán: khách thấy ngay hàng đã vào giỏ
 * và có nút thanh toán trước mắt, thay vì phải tự tìm đường tới trang giỏ hàng.
 * Vẫn có nút "Tiếp tục mua sắm" để không ép buộc — ngăn kéo chặn đường mua tiếp
 * sẽ phản tác dụng.
 */
export default function CartDrawer() {
  const { t } = useT();
  const { cart, count, drawerOpen, closeDrawer, updateItem, removeItem } = useCart();

  // Esc để đóng, và khoá cuộn nền khi ngăn kéo mở.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen, closeDrawer]);

  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, i) => sum + effectivePrice(i.variant, i.variant?.product?.campaignDiscountPercent) * i.quantity,
    0,
  );

  return (
    <>
      {/* Nền mờ */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('cart.title')}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-xl transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-lg font-bold text-text">
            {t('cart.title')}
            {count > 0 && <span className="ml-2 font-sans text-sm font-normal text-text-muted">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label={t('common.close')}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X size={20} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag size={36} className="text-text-faint" />
            <p className="text-text-muted">{t('cart.empty')}</p>
            <Link href="/products" onClick={closeDrawer}>
              <Button size="sm" variant="outline">{t('cart.continueShopping')}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-border overflow-y-auto">
              {items.map((item) => {
                const price = effectivePrice(item.variant, item.variant?.product?.campaignDiscountPercent);
                const image = item.variant?.images?.[0];
                return (
                  <div key={item.id} className="flex gap-3 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt">
                      {image ? (
                        <Image src={image} alt={item.variant?.product?.name ?? ''} width={80} height={80}
                          className="h-full w-full object-cover" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.variant?.product?.slug ?? ''}`}
                        onClick={closeDrawer}
                        className="font-medium text-text hover:underline line-clamp-2"
                      >
                        {item.variant?.product?.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-text-muted">{item.variant?.name}</p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg border border-border">
                          <button
                            type="button"
                            aria-label={t('cart.decrease')}
                            disabled={item.quantity <= 1}
                            onClick={() => updateItem(item.id, item.quantity - 1)}
                            className="px-2 py-1 text-text-muted transition-colors hover:text-text disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[2rem] text-center font-mono text-sm text-text">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={t('cart.increase')}
                            onClick={() => updateItem(item.id, item.quantity + 1)}
                            className="px-2 py-1 text-text-muted transition-colors hover:text-text"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <span className="font-mono text-sm text-text">{formatPrice(price * item.quantity)}</span>

                        <button
                          type="button"
                          aria-label={t('cart.remove')}
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-text-faint transition-colors hover:text-error"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="space-y-3 border-t border-border p-5">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">{t('cart.subtotal')}</span>
                <span className="font-mono text-lg font-semibold text-text">{formatPrice(subtotal)}</span>
              </div>
              {/* Phí vận chuyển phụ thuộc địa chỉ nên chỉ chốt được ở bước thanh toán. */}
              <p className="text-xs text-text-faint">{t('cart.shippingAtCheckout')}</p>

              <Link href="/checkout" onClick={closeDrawer} className="block">
                <Button className="w-full">{t('cart.checkout')}</Button>
              </Link>
              <Link href="/cart" onClick={closeDrawer} className="block">
                <Button variant="outline" className="w-full">{t('cart.viewCart')}</Button>
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
