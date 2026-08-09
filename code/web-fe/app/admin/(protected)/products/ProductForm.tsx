'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Category, Product } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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
  const labelCls = 'mb-1.5 block';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label className={labelCls} htmlFor="name">Name *</Label>
          <Input id="name" name="name" required value={form.name} onChange={handleChange} onBlur={autoSlug} placeholder="Tiny Dragon" />
        </div>
        <div>
          <Label className={labelCls} htmlFor="slug">Slug *</Label>
          <Input id="slug" name="slug" required value={form.slug} onChange={handleChange} placeholder="tiny-dragon" />
        </div>
      </div>

      <div>
        <Label className={labelCls} htmlFor="categoryId">Category</Label>
        <NativeSelect id="categoryId" name="categoryId" value={form.categoryId} onChange={handleChange}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
      </div>

      <div>
        <Label className={labelCls} htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={10} value={form.description} onChange={handleChange} placeholder="Describe the product…"  className="resize-none" />
      </div>

      <div className="flex items-center gap-3">
        <Checkbox id="cb-isactive" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v === true }))} />
        <Label htmlFor="cb-isactive" className="text-sm font-medium text-text cursor-pointer font-normal">Published (visible in storefront)</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Product'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
