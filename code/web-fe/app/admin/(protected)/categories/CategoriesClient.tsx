'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState<Category | null>(null);
  const [showForm,   setShowForm]   = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Category[]>('/categories', { token });
      setCategories(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteCategory(id: number) {
    if (!confirm('Delete this category?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await api.delete(`/admin/categories/${id}`, { token });
      toast.success('Category deleted.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (loading) return <div className="text-text-muted">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Categories</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Category
        </Button>
      </div>

      {showForm && (
        <CategoryForm
          category={editing ?? undefined}
          allCategories={categories}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No categories yet.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{cat.name}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-text-muted">{categories.find((c) => c.id === cat.parentId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{cat.isActive ? '✓ Active' : '✗ Hidden'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(cat); setShowForm(true); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCategory(cat.id)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryForm({
  category, allCategories, onSaved, onCancel,
}: {
  category?: Category;
  allCategories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!category;
  const [form,    setForm]    = useState({ name: category?.name ?? '', slug: category?.slug ?? '', description: category?.description ?? '', parentId: category?.parentId ? String(category.parentId) : '', isActive: category?.isActive ?? true });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  }

  function autoSlug() {
    if (!form.slug && form.name) setForm((f) => ({ ...f, slug: f.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    const body = { ...form, parentId: form.parentId ? Number(form.parentId) : undefined };
    try {
      if (isEdit) { await api.put(`/admin/categories/${category.id}`, body, { token }); }
      else        { await api.post('/admin/categories', body, { token }); }
      toast.success(isEdit ? 'Category updated.' : 'Category created.');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={save} className="mb-6 p-5 rounded-xl border border-brand-lighter bg-brand-faint space-y-4">
      <h3 className="font-medium text-text">{isEdit ? 'Edit Category' : 'New Category'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Name *</label>
          <input name="name" required value={form.name} onChange={handleChange} onBlur={autoSlug} className={inputCls} placeholder="Mythical Creatures" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Slug *</label>
          <input name="slug" required value={form.slug} onChange={handleChange} className={inputCls} placeholder="mythical-creatures" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Parent Category</label>
          <select name="parentId" value={form.parentId} onChange={handleChange} className={inputCls}>
            <option value="">None</option>
            {allCategories.filter((c) => !category || c.id !== category.id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 accent-brand" />
        <span className="text-sm text-text">Active</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
