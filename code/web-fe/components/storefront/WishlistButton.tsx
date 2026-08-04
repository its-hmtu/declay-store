'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { wishlistApi } from '@/lib/api';
import { auth } from '@/lib/auth';

/** Toggles the given variant in the customer's wishlist. */
export default function WishlistButton({ variantId, className = '' }: { variantId: number; className?: string }) {
  const router = useRouter();
  const [itemId, setItemId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) return;
    wishlistApi.get(token)
      .then((res) => {
        const found = res.data.items.find((i) => i.variantId === variantId);
        setItemId(found?.id ?? null);
      })
      .catch(() => undefined);
  }, [variantId]);

  const saved = itemId !== null;

  async function toggle() {
    const token = auth.getToken();
    if (!token) { router.push('/login?next=/products'); return; }
    setBusy(true);
    try {
      if (saved && itemId !== null) {
        const res = await wishlistApi.remove(token, itemId);
        setItemId(null);
        void res;
        toast.success('Removed from wishlist.');
      } else {
        const res = await wishlistApi.add(token, variantId);
        const found = res.data.items.find((i) => i.variantId === variantId);
        setItemId(found?.id ?? null);
        toast.success('Saved to wishlist.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        saved
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-text-muted hover:border-accent hover:text-accent'
      } ${className}`}
    >
      <Heart size={16} className={saved ? 'fill-accent' : ''} />
      {saved ? 'Saved' : 'Wishlist'}
    </button>
  );
}
