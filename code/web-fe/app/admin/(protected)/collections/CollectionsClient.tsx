'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Collection, Product } from '@/lib/types';
import { adminCollectionsApi, productsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';

export default function CollectionsClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState<Collection | null>(null);
  const [showForm, setShowForm]       = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const [c, p] = await Promise.all([
        adminCollectionsApi.list(token),
        productsApi.list({ limit: 500 }),
      ]);
      setCollections(c.data);
      setProducts(p.data);
    } catch { toast.error('Failed to load collections.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this collection?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try { await adminCollectionsApi.remove(token, id); toast.success('Deleted.'); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Delete failed.'); }
  }

  if (loading) return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-4">
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Collections</h1>
          <p className="text-sm text-text-muted mt-1">Curated product groups shown on the storefront.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Collection
        </Button>
      </div>

      {showForm && (
        <CollectionForm
          collection={editing ?? undefined}
          products={products}
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
              <th className="px-4 py-3 text-left">Products</th>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No collections yet.</td></tr>
            )}
            {collections.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-text">{c.name}</td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 text-text-muted">{c.productCount ?? c.productIds?.length ?? 0}</td>
                <td className="px-4 py-3 text-text-muted">{c.sortOrder}</td>
                <td className="px-4 py-3">
                  {c.isActive ? (
                    <span className="text-xs font-medium text-success bg-success/10 rounded px-2 py-0.5">Active</span>
                  ) : (
                    <span className="text-xs font-medium text-text-muted bg-surface-alt rounded px-2 py-0.5">Hidden</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 text-text-muted hover:text-brand"><Pencil size={15} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 text-text-muted hover:text-error"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollectionForm({
  collection, products, onSaved, onCancel,
}: {
  collection?: Collection;
  products: Product[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName]               = useState(collection?.name ?? '');
  const [slug, setSlug]               = useState(collection?.slug ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [sortOrder, setSortOrder]     = useState(String(collection?.sortOrder ?? 0));
  const [isActive, setIsActive]       = useState(collection?.isActive ?? true);
  const [selected, setSelected]       = useState<Set<number>>(new Set(collection?.productIds ?? []));
  const [search, setSearch]           = useState('');
  const [saving, setSaving]           = useState(false);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;

    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
      sortOrder: Number.isFinite(parseInt(sortOrder, 10)) ? parseInt(sortOrder, 10) : 0,
      isActive,
      productIds: Array.from(selected),
    };
    if (slug.trim() !== '') body.slug = slug.trim();

    setSaving(true);
    try {
      if (collection) await adminCollectionsApi.update(token, collection.id, body);
      else await adminCollectionsApi.create(token, body);
      toast.success(collection ? 'Collection updated.' : 'Collection created.');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={150}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text"
            placeholder="Holiday Picks" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={170}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text font-mono text-sm"
            placeholder="auto from name if blank" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text"
          placeholder="Optional short blurb shown on the collection page" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Sort order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={0}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text" />
        </div>
        <label className="flex items-center gap-2 text-sm text-text pb-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand" />
          Active (visible on storefront)
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-text">Products ({selected.size} selected)</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text" />
        </div>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {filtered.length === 0 && <p className="px-3 py-4 text-sm text-text-muted text-center">No products.</p>}
          {filtered.map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-surface-alt">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-brand" />
              <span className="text-text">{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" loading={saving}>{collection ? 'Save changes' : 'Create collection'}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
