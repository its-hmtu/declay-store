'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { Product, ProductVariant } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import ProductForm from '../ProductForm';
import Button from '@/components/ui/Button';

export default function EditProductClient({ productId }: { productId: number }) {
  const [product,  setProduct]  = useState<Product | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [showVarForm, setShowVarForm] = useState(false);

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

  if (loading)    return <div className="text-text-muted">Loading…</div>;
  if (!product)   return <div className="text-text-muted">Product not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-text">Edit: {product.name}</h1>
        <Link href="/admin/products" className="text-sm text-brand hover:underline">&larr; Products</Link>
      </div>

      <ProductForm product={product} />

      {/* Variants section */}
      <div className="mt-12 pt-8 border-t border-border max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-text">Variants</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowVarForm((v) => !v)}>
            <Plus size={14} /> Add Variant
          </Button>
        </div>

        {showVarForm && (
          <VariantForm productId={productId} onSaved={() => { setShowVarForm(false); loadProduct(); }} />
        )}

        <div className="space-y-2 mt-4">
          {product.variants?.map((v) => (
            <VariantRow key={v.id} variant={v} productId={productId} onDeleted={loadProduct} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VariantForm({ productId, onSaved }: { productId: number; onSaved: () => void }) {
  const [form,    setForm]    = useState({ name: '', price: '', stock: '0', images: '' });
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      await api.post(`/admin/products/${productId}/variants`, {
        ...form,
        price:  parseFloat(form.price),
        stock:  parseInt(form.stock, 10),
        images: form.images ? form.images.split(',').map((s) => s.trim()).filter(Boolean) : [],
      }, { token });
      toast.success('Variant added.');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={save} className="p-4 rounded-xl border border-brand-lighter bg-brand-faint space-y-3 mb-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Name *</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({...f, name: e.target.value}))} className={inputCls} placeholder="Standard" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Price *</label>
          <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({...f, price: e.target.value}))} className={inputCls} placeholder="29.99" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Stock</label>
          <input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({...f, stock: e.target.value}))} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text mb-1">Image URLs (comma-separated)</label>
        <input value={form.images} onChange={(e) => setForm((f) => ({...f, images: e.target.value}))} className={inputCls} placeholder="https://…, https://…" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>Save Variant</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => {}}>Cancel</Button>
      </div>
    </form>
  );
}

function VariantRow({ variant, productId, onDeleted }: { variant: ProductVariant; productId: number; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function del() {
    if (!confirm(`Delete variant "${variant.name}"?`)) return;
    const token = adminAuth.getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${productId}/variants/${variant.id}`, { token });
      toast.success('Variant deleted.');
      onDeleted();
    } catch {
      toast.error('Delete failed.');
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface text-sm">
      <div>
        <span className="font-medium text-text">{variant.name}</span>
        <span className="text-text-muted mx-2">·</span>
        <span className="text-brand">${parseFloat(variant.price).toFixed(2)}</span>
        <span className="text-text-muted mx-2">·</span>
        <span className="text-text-muted">{variant.stock} in stock</span>
      </div>
      <button onClick={del} disabled={deleting} className="text-text-faint hover:text-error transition-colors disabled:opacity-40">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
