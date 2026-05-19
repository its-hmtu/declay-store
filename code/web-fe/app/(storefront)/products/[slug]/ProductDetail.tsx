'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { Product, ProductVariant } from '@/lib/types';
import { cartApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';

export default function ProductDetail({ product }: { product: Product }) {
  const variants = product.variants?.filter((v) => v.isActive) ?? [];
  const [selected, setSelected] = useState<ProductVariant | null>(variants[0] ?? null);
  const [qty,      setQty]      = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [imgIdx,   setImgIdx]   = useState(0);

  const isValidSrc = (src: string) => src.startsWith('/') || src.startsWith('http');
  const images = (selected?.images ?? []).filter(isValidSrc);

  async function addToCart() {
    const token = auth.getToken();
    if (!token) { toast.error('Please log in to add items to cart.'); return; }
    if (!selected) return;
    setLoading(true);
    try {
      await cartApi.add(token, selected.id, qty);
      toast.success(`${product.name} added to cart!`);
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
                  <Image src={src} alt="" width={64} height={64} className="w-full h-full object-cover" />
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
            <p className="mt-4 text-2xl font-semibold text-brand">${parseFloat(selected.price).toFixed(2)}</p>
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
            <Button
              onClick={addToCart}
              loading={loading}
              disabled={!selected || selected.stock === 0}
              className="flex-1"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
