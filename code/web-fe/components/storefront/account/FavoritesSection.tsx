'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { Wishlist } from '@/lib/types';
import { wishlistApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';
import { useCart } from '@/lib/cart/CartProvider';

type Sort = 'name' | 'name_desc' | 'price_asc' | 'price_desc';

/**
 * M-32: mục "Yêu thích" trong khu vực Tài khoản (route /account/favorites) —
 * thay cho trang /wishlist rời. Cho sắp xếp theo tên (A–Z) hoặc giá (tăng/giảm).
 */
export default function FavoritesSection() {
  const { t } = useT();
  const { addItem } = useCart();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>('name');

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }
    wishlistApi.get(token)
      .then((res) => setWishlist(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function remove(itemId: number) {
    const token = auth.getToken();
    if (!token) return;
    setBusy(itemId);
    try {
      const res = await wishlistApi.remove(token, itemId);
      setWishlist(res.data);
    } catch {
      toast.error('Không xoá được.');
    } finally {
      setBusy(null);
    }
  }

  async function moveToCart(itemId: number, variantId: number) {
    const token = auth.getToken();
    if (!token) return;
    setBusy(itemId);
    try {
      await addItem(variantId, 1);
      const res = await wishlistApi.remove(token, itemId);
      setWishlist(res.data);
      toast.success('Đã thêm vào giỏ.');
    } catch {
      toast.error('Không thêm được vào giỏ.');
    } finally {
      setBusy(null);
    }
  }

  const items = useMemo(() => {
    const list = [...(wishlist?.items ?? [])];
    list.sort((a, b) => {
      if (sort === 'name' || sort === 'name_desc') {
        const cmp = (a.variant?.product?.name ?? '').localeCompare(b.variant?.product?.name ?? '', 'vi');
        return sort === 'name' ? cmp : -cmp;
      }
      const pa = Number(a.variant?.price ?? 0);
      const pb = Number(b.variant?.price ?? 0);
      return sort === 'price_asc' ? pa - pb : pb - pa;
    });
    return list;
  }, [wishlist, sort]);

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-3xl font-bold text-text">{t('accountNav.wishlist')}</h1>
        {items.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-text-muted">
            {t('favorites.sortBy')}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand focus:outline-none"
            >
              <option value="name">{t('favorites.sortName')}</option>
              <option value="name_desc">{t('favorites.sortNameDesc')}</option>
              <option value="price_asc">{t('favorites.sortPriceAsc')}</option>
              <option value="price_desc">{t('favorites.sortPriceDesc')}</option>
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-14 text-center text-text-muted">
          <Heart size={28} className="mx-auto mb-3 text-text-faint" />
          <p>{t('favorites.empty')}</p>
          <Link href="/products" className="mt-3 inline-block font-medium text-brand hover:underline">{t('cart.continueShopping')}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const v = item.variant;
            const slug = v?.product?.slug;
            const img = v?.images?.[0];
            return (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  {slug ? (
                    <Link href={`/products/${slug}`} className="font-medium text-text hover:underline line-clamp-2">
                      {v?.product?.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-text">{v?.product?.name ?? 'Product'}</p>
                  )}
                  <p className="text-sm text-text-muted mt-0.5">{v?.name}</p>
                  <p className="mt-0.5 font-mono text-sm text-brand">{formatPrice(Number(v?.price ?? 0))}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === item.id}
                    disabled={!v || v.stock <= 0}
                    onClick={() => v && moveToCart(item.id, v.id)}
                  >
                    <ShoppingCart size={14} /> {v && v.stock > 0 ? t('product.addToCart') : t('product.soldOut')}
                  </Button>
                  <button
                    onClick={() => remove(item.id)}
                    disabled={busy === item.id}
                    className="p-2 text-text-faint transition-colors hover:text-error disabled:opacity-40"
                    aria-label={t('cart.remove')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
