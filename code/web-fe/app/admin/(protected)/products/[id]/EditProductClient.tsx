'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Product, ProductVariant } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import ProductForm from '../ProductForm';
import ImageUploader from '@/components/admin/ImageUploader';
import Button from '@/components/ui/Button';

export default function EditProductClient({ productId }: { productId: number }) {
  const [product,  setProduct]  = useState<Product | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);

  async function loadProduct() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Product>(`/admin/products/${productId}`, { token });
      setProduct(res.data);
    } catch {
      toast.error('Product not found.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProduct(); }, [productId]);

  if (loading)  return <div className="text-text-muted">Loading…</div>;
  if (!product) return <div className="text-text-muted">Product not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-text">Edit: {product.name}</h1>
        <Link href="/admin/products" className="text-sm text-brand hover:underline">&larr; Products</Link>
      </div>

      <ProductForm product={product} />

      {/* Variants — where price, stock and images live */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-text">Variants</h2>
          {!adding && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add Variant
            </Button>
          )}
        </div>

        {adding && (
          <VariantEditor
            productId={productId}
            onDone={() => { setAdding(false); loadProduct(); }}
            onCancel={() => setAdding(false)}
          />
        )}

        <div className="space-y-2 mt-4">
          {product.variants && product.variants.length > 0 ? (
            product.variants.map((v) => (
              <VariantRow key={v.id} variant={v} productId={productId} onChanged={loadProduct} />
            ))
          ) : (
            !adding && <p className="text-sm text-text-muted">No variants yet. Add one to set price, stock, and images.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* Shared add/edit form for a variant (name, price, stock, images) */
function VariantEditor({
  productId, variant, onDone, onCancel,
}: {
  productId: number;
  variant?: ProductVariant;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!variant;
  const [name,   setName]   = useState(variant?.name ?? '');
  const [price,  setPrice]  = useState(variant ? String(variant.price) : '');
  const [specialPrice, setSpecialPrice] = useState(variant?.specialPrice ? String(variant.specialPrice) : '');
  const [stock,  setStock]  = useState(variant ? String(variant.stock) : '0');
  const [images, setImages] = useState<string[]>(variant?.images ?? []);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    const body = {
      name, price: parseFloat(price), stock: parseInt(stock || '0', 10), images,
      specialPrice: specialPrice.trim() === '' ? null : parseFloat(specialPrice),
    };
    try {
      if (isEdit) await api.put(`/admin/products/${productId}/variants/${variant.id}`, body, { token });
      else        await api.post(`/admin/products/${productId}/variants`, body, { token });
      toast.success(isEdit ? 'Variant updated.' : 'Variant added.');
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={save} className="p-4 rounded-xl border border-brand-lighter bg-brand-faint space-y-3 mb-2">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Standard Edition" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Price *</label>
          <input required type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="29.99" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Stock</label>
          <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Special price</label>
          <input type="number" step="0.01" min="0" value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} className={inputCls} placeholder="optional" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text mb-1.5">Images</label>
        <ImageUploader value={images} onChange={setImages} max={10} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save Variant' : 'Add Variant'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function VariantRow({ variant, productId, onChanged }: { variant: ProductVariant; productId: number; onChanged: () => void }) {
  const [editing,  setEditing]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    if (!confirm(`Delete variant "${variant.name}"?`)) return;
    const token = adminAuth.getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${productId}/variants/${variant.id}`, { token });
      toast.success('Variant deleted.');
      onChanged();
    } catch {
      toast.error('Delete failed.');
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <VariantEditor
        productId={productId}
        variant={variant}
        onDone={() => { setEditing(false); onChanged(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface text-sm">
      <div className="flex items-center gap-3 min-w-0">
        {variant.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={variant.images[0]} alt="" className="size-10 rounded object-cover border border-border shrink-0" />
        ) : (
          <div className="size-10 rounded bg-surface-alt border border-border shrink-0" />
        )}
        <div className="min-w-0">
          <span className="font-medium text-text">{variant.name}</span>
          <span className="text-text-muted mx-2">·</span>
          <span className="text-brand">${parseFloat(variant.price).toFixed(2)}</span>
          <span className="text-text-muted mx-2">·</span>
          <span className="text-text-muted">{variant.stock} in stock</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 text-text-faint hover:text-brand transition-colors" aria-label="Edit variant">
          <Pencil size={14} />
        </button>
        <button onClick={del} disabled={deleting} className="p-1.5 text-text-faint hover:text-error transition-colors disabled:opacity-40" aria-label="Delete variant">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
