'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Banner } from '@/lib/types';
import { adminBannersApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ImageUploader from '@/components/admin/ImageUploader';
import FilterBar from '@/components/admin/FilterBar';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function BannersClient() {
  const [banners,  setBanners]  = useState<Banner[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('all');

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminBannersApi.list(token);
      setBanners(res.data);
    } catch { toast.error('Failed to load banners.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => banners.filter((b) =>
    (search === '' || (b.title ?? '').toLowerCase().includes(search.toLowerCase())) &&
    (status === 'all' || (status === 'active' ? b.isActive : !b.isActive)),
  ), [banners, search, status]);

  const { page, setPage, totalPages, total, paged } = usePagination(filtered, 10);

  async function remove(id: number) {
    if (!confirm('Delete this banner?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await adminBannersApi.remove(token, id);
      toast.success('Banner deleted.');
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
        <h1 className="font-serif text-3xl font-bold text-text">Banners</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Banner
        </Button>
      </div>

      {showForm && (
        <BannerForm
          banner={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search banners…"
        fields={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'hidden', label: 'Hidden' }] }]}
        values={{ status }}
        onValuesChange={(v) => setStatus(v.status)}
        onApplied={() => setPage(1)}
      />

      <Card className="overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Preview</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Position</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No banners found.</td></tr>
            ) : (
              paged.map((b) => (
                <tr key={b.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-28 h-12 rounded-md bg-surface-alt overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text">{b.title || <span className="text-text-faint">—</span>}</td>
                  <td className="px-4 py-3 text-text-muted">{b.position}</td>
                  <td className="px-4 py-3"><Badge variant={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Active' : 'Hidden'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(b); setShowForm(true); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(b.id)}><Trash2 size={14} /></Button>
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

function BannerForm({ banner, onSaved, onCancel }: { banner?: Banner; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!banner;
  const [form, setForm] = useState({
    title:    banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    imageUrl: banner?.imageUrl ?? '',
    linkUrl:  banner?.linkUrl ?? '',
    position: banner?.position != null ? String(banner.position) : '0',
    isActive: banner?.isActive ?? true,
    startsAt: banner?.startsAt ? banner.startsAt.slice(0, 10) : '',
    endsAt:   banner?.endsAt ? banner.endsAt.slice(0, 10) : '',
  });
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    if (!form.imageUrl) { toast.error('An image is required.'); return; }
    setLoading(true);
    const body = {
      title:    form.title || null,
      subtitle: form.subtitle || null,
      imageUrl: form.imageUrl,
      linkUrl:  form.linkUrl || null,
      position: Number(form.position) || 0,
      isActive: form.isActive,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt:   form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
    try {
      if (isEdit) await adminBannersApi.update(token, banner.id, body);
      else        await adminBannersApi.create(token, body);
      toast.success(isEdit ? 'Banner updated.' : 'Banner created.');
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
        <h3 className="font-medium text-text">{isEdit ? 'Edit Banner' : 'New Banner'}</h3>
        <div>
          <Label className="mb-1.5 block text-xs">Image *</Label>
          <ImageUploader
            value={form.imageUrl ? [form.imageUrl] : []}
            onChange={(urls) => setForm((f) => ({ ...f, imageUrl: urls[0] ?? '' }))}
            multiple={false}
            max={1}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Summer Collection" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Up to 20% off" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Link URL</Label>
            <Input value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="/products?categoryId=8" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Position (order)</Label>
            <Input type="number" min="0" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Starts</Label>
            <Input type="date" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Ends</Label>
            <Input type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-isactive" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v === true }))} />
          <Label htmlFor="cb-isactive" className="text-sm text-text cursor-pointer font-normal">Active</Label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
