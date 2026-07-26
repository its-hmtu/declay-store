'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { Wishlist } from '@/lib/types';
import { wishlistApi, cartApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';

export default function WishlistClient() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState<number | null>(null);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { router.push('/login?next=/wishlist'); return; }
    wishlistApi.get(token)
      .then((res) => setWishlist(res.data))
      .catch(() => toast.error('Failed to load wishlist.'))
      .finally(() => setLoading(false));
  }, [router]);

  async function remove(itemId: number) {
    const token = auth.getToken();
    if (!token) return;
    setBusy(itemId);
    try {
      const res = await wishlistApi.remove(token, itemId);
      setWishlist(res.data);
      toast.success('Removed from wishlist.');
    } catch {
      toast.error('Failed to remove.');
    } finally {
      setBusy(null);
    }
  }

  async function moveToCart(itemId: number, variantId: number) {
    const token = auth.getToken();
    if (!token) return;
    setBusy(itemId);
    try {
      await cartApi.add(token, variantId, 1);
      const res = await wishlistApi.remove(token, itemId);
      setWishlist(res.data);
      toast.success('Added to cart.');
    } catch {
      toast.error('Could not add to cart.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 text-text-muted">Loading…</div>;

  const items = wishlist?.items ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-4xl font-bold text-text mb-8 flex items-center gap-3">
        <Heart className="text-accent" /> Wishlist
      </h1>

      {items.length === 0 ? (
        <div className="py-24 text-center text-text-muted">
          <p className="text-lg mb-4">Your wishlist is empty.</p>
          <Link href="/products"><Button variant="outline">Browse products</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const v = item.variant;
            const slug = v?.product?.slug;
            const img = v?.images?.[0];
            return (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface">
                <div className="size-20 rounded-lg bg-surface-alt overflow-hidden border border-border shrink-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  {slug ? (
                    <Link href={`/products/${slug}`} className="font-medium text-text hover:underline">
                      {v?.product?.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-text">{v?.product?.name ?? 'Product'}</p>
                  )}
                  <p className="text-sm text-text-muted">{v?.name}</p>
                  <p className="font-mono text-sm text-brand mt-0.5">{formatPrice(Number(v?.price ?? 0))}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === item.id}
                    disabled={!v || v.stock <= 0}
                    onClick={() => v && moveToCart(item.id, v.id)}
                  >
                    <ShoppingCart size={14} /> {v && v.stock > 0 ? 'Add to cart' : 'Sold out'}
                  </Button>
                  <button
                    onClick={() => remove(item.id)}
                    disabled={busy === item.id}
                    className="p-2 text-text-faint hover:text-error transition-colors disabled:opacity-40"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
