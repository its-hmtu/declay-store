'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Cart } from '@/lib/types';
import { cartApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function CartClient() {
  const [cart,    setCart]    = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await cartApi.get(token);
      setCart(res.data);
    } catch {
      toast.error('Could not load cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  async function updateQty(itemId: number, qty: number) {
    const token = auth.getToken();
    if (!token) return;
    try {
      const res = await cartApi.update(token, itemId, qty);
      setCart(res.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function removeItem(itemId: number) {
    const token = auth.getToken();
    if (!token) return;
    try {
      const res = await cartApi.remove(token, itemId);
      setCart(res.data);
      toast.success('Item removed.');
    } catch {
      toast.error('Remove failed.');
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center text-text-muted">Loading cart…</div>
  );

  if (!auth.isLoggedIn()) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <h1 className="font-serif text-3xl font-bold text-text mb-4">Your Cart</h1>
      <p className="text-text-muted mb-6">Please log in to view your cart.</p>
      <Link href="/login" className="inline-flex items-center px-7 py-3 bg-brand text-white rounded-lg hover:bg-brand-light transition-colors font-medium">
        Log in
      </Link>
    </div>
  );

  const items   = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.variant?.price ?? '0');
    return sum + price * item.quantity;
  }, 0);

  if (items.length === 0) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <h1 className="font-serif text-3xl font-bold text-text mb-4">Your Cart</h1>
      <p className="text-text-muted mb-6">Your cart is empty.</p>
      <Link href="/products" className="inline-flex items-center px-7 py-3 bg-brand text-white rounded-lg hover:bg-brand-light transition-colors font-medium">
        Shop Now
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-text mb-8">Your Cart</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Items */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => {
            const variant = item.variant;
            const product = variant?.product;
            const image   = variant?.images?.[0];
            const price   = parseFloat(variant?.price ?? '0');

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
                  <p className="mt-1 text-brand font-semibold">${price.toFixed(2)}</p>
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
                  <p className="text-sm font-medium text-text">${(price * item.quantity).toFixed(2)}</p>
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
                <span>Subtotal</span>
                <span className="text-text font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between font-semibold text-text">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <Link href="/checkout">
              <Button className="w-full mt-6">Proceed to Checkout</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
