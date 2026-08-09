'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Collection, Product } from '@/lib/types';
import { adminCollectionsApi, productsApi, uploadImage } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

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

      <Card className="overflow-hidden py-0">
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
      </Card>
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
  // M-46: cover image, reusing the existing admin upload endpoint.
  const [imageUrl, setImageUrl]       = useState(collection?.imageUrl ?? '');
  const [uploading, setUploading]     = useState(false);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const token = adminAuth.getToken();
    if (!file || !token) return;
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file, token));
      toast.success('Cover image uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

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
      imageUrl: imageUrl.trim() === '' ? null : imageUrl.trim(),
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
    <Card className="mb-6 p-5 py-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={150}
              placeholder="Holiday Picks" />
          </div>
          <div>
            <Label className="mb-1.5 block">Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={170}
              placeholder="auto from name if blank" className="font-mono text-sm" />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
            placeholder="Optional short blurb shown on the collection page" />
        </div>

        {/* M-46: used by the home/index carousels, the collection page header, and
            the Open Graph card when the collection link is shared. */}
        <div>
          <Label className="mb-1.5 block">Cover image</Label>
          <div className="flex items-start gap-4">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Cover preview" className="h-20 w-36 rounded-lg border border-border object-cover" />
            )}
            <div className="flex-1">
              <input
                type="file" accept="image/*" onChange={handleImage} disabled={uploading}
                className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand file:text-white file:text-sm hover:file:bg-brand-light cursor-pointer"
              />
              {uploading && <p className="mt-1 text-xs text-text-muted">Uploading…</p>}
              <p className="mt-1.5 text-xs text-text-faint">
                Wide crop (about 3:1). Shown above the product row on the home page and collections index.
              </p>
              {imageUrl && (
                <button
                  type="button" onClick={() => setImageUrl('')}
                  className="mt-1 text-xs text-error hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <Label className="mb-1.5 block">Sort order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={0} />
          </div>
          <div className="flex items-center gap-2 text-sm text-text pb-2">
          <Checkbox id="cb-isactive" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          <Label htmlFor="cb-isactive" className="cursor-pointer font-normal">Active (visible on storefront)</Label>
        </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="block">Products ({selected.size} selected)</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
              className="h-8 w-56 text-sm" />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {filtered.length === 0 && <p className="px-3 py-4 text-sm text-text-muted text-center">No products.</p>}
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-alt">
                <Checkbox id={`cb-selected-has-${p.id}`} checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <Label htmlFor={`cb-selected-has-${p.id}`} className="text-text cursor-pointer font-normal">{p.name}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" loading={saving}>{collection ? 'Save changes' : 'Create collection'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
