'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import FilterBar from '@/components/admin/FilterBar';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState<Category | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [search,     setSearch]     = useState('');

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Category[]>('/admin/categories?limit=100', { token });
      setCategories(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => categories.filter((c) =>
    search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()),
  ), [categories, search]);

  const { page, setPage, totalPages, total, paged } = usePagination(filtered, 10);

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

  if (loading) return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      <Card className="overflow-hidden py-0">
        <div className="p-4">
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-3 w-40" />
        </div>
      </Card>
    </div>
  );

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

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories…"
        onApplied={() => setPage(1)}
      />

      <Card className="overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Home</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No categories found.</td></tr>
            ) : (
              paged.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-text-muted text-xs">{cat.id}</td>
                  <td className="px-4 py-3 font-medium text-text">{cat.name}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-text-muted">{categories.find((c) => c.id === cat.parentId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{cat.isActive ? '✓ Active' : '✗ Hidden'}</td>
                  <td className="px-4 py-3">
                    {cat.showOnHome
                      ? <span className="text-xs font-medium text-success bg-success/10 rounded px-2 py-0.5">On home</span>
                      : <span className="text-xs text-text-faint">—</span>}
                  </td>
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
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
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
  const [form,    setForm]    = useState({ name: category?.name ?? '', slug: category?.slug ?? '', description: category?.description ?? '', parentId: category?.parentId ? String(category.parentId) : '', isActive: category?.isActive ?? true, showOnHome: category?.showOnHome ?? false });
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

  return (
    <Card className="mb-6 p-5 py-5 border-brand-lighter bg-brand-faint">
      <form onSubmit={save} className="space-y-4">
        <h3 className="font-medium text-text">{isEdit ? 'Edit Category' : 'New Category'}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">Name *</Label>
            <Input name="name" required value={form.name} onChange={handleChange} onBlur={autoSlug} placeholder="Mythical Creatures" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Slug *</Label>
            <Input name="slug" required value={form.slug} onChange={handleChange} placeholder="mythical-creatures" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Parent Category</Label>
            <NativeSelect name="parentId" value={form.parentId} onChange={handleChange}>
              <option value="">None</option>
              {allCategories.filter((c) => !category || c.id !== category.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-isactive" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v === true }))} />
          <Label htmlFor="cb-isactive" className="text-sm text-text cursor-pointer font-normal">Active</Label>
        </div>

        {/* M-47: which categories deserve the home page is a merchandising call
            that changes with the season, so it is a switch rather than a rule the
            code guesses at. */}
        <div className="flex items-start gap-2">
          <Checkbox id="cb-showonhome" checked={form.showOnHome} onCheckedChange={(v) => setForm((f) => ({ ...f, showOnHome: v === true }))} className="mt-0.5" />
          <Label htmlFor="cb-showonhome" className="text-sm text-text cursor-pointer font-normal">
            Show on home page
            <span className="block text-xs text-text-muted">
              Adds a product row for this category. The first two flagged categories are used.
            </span>
          </Label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
