'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Category, Product } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

interface Props {
  product?: Product;
}

export default function ProductForm({ product }: Props) {
  const router     = useRouter();
  const isEdit     = !!product;
  const [loading,    setLoading]    = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name:        product?.name        ?? '',
    slug:        product?.slug        ?? '',
    description: product?.description ?? '',
    categoryId:  product?.categoryId  ? String(product.categoryId) : '',
    isActive:    product?.isActive    ?? true,
  });

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Category[]>('/categories', { token })
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function autoSlug() {
    if (!form.slug && form.name) {
      setForm((f) => ({ ...f, slug: f.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    const body = { ...form, categoryId: form.categoryId ? Number(form.categoryId) : undefined };
    try {
      if (isEdit) {
        await api.put(`/admin/products/${product.id}`, body, { token });
        toast.success('Product updated.');
      } else {
        await api.post('/admin/products', body, { token });
        toast.success('Product created.');
        router.push('/admin/products');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint';
  const labelCls = 'block text-sm font-medium text-text mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="name">Name *</label>
          <input id="name" name="name" required value={form.name} onChange={handleChange} onBlur={autoSlug} className={inputCls} placeholder="Tiny Dragon" />
        </div>
        <div>
          <label className={labelCls} htmlFor="slug">Slug *</label>
          <input id="slug" name="slug" required value={form.slug} onChange={handleChange} className={inputCls} placeholder="tiny-dragon" />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="categoryId">Category</label>
        <select id="categoryId" name="categoryId" value={form.categoryId} onChange={handleChange} className={inputCls}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={5} value={form.description} onChange={handleChange} className={`${inputCls} resize-none`} placeholder="Describe the product…" />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 accent-brand" />
        <span className="text-sm font-medium text-text">Published (visible in storefront)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Product'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
