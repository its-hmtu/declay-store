'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Campaign, Product } from '@/lib/types';
import { adminCampaignsApi, productsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function isLive(c: Campaign): boolean {
  if (!c.isActive) return false;
  const now = Date.now();
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return false;
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return false;
  return true;
}

export default function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<Campaign | null>(null);
  const [showForm, setShowForm]   = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const [c, p] = await Promise.all([
        adminCampaignsApi.list(token),
        productsApi.list({ limit: 500 }),
      ]);
      setCampaigns(c.data);
      setProducts(p.data);
    } catch { toast.error('Failed to load campaigns.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this campaign?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try { await adminCampaignsApi.remove(token, id); toast.success('Deleted.'); load(); }
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
          <h1 className="font-serif text-3xl font-bold text-text">Campaigns</h1>
          <p className="text-sm text-text-muted mt-1">Apply a shared discount to a set of products for a period of time.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Campaign
        </Button>
      </div>

      {showForm && (
        <CampaignForm
          campaign={editing ?? undefined}
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
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-left">Products</th>
              <th className="px-4 py-3 text-left">Window</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No campaigns yet.</td></tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-text">{c.name}</td>
                <td className="px-4 py-3 text-text">-{Number(c.discountPercent)}%</td>
                <td className="px-4 py-3 text-text-muted">{c.productIds?.length ?? 0}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{fmt(c.startsAt)} → {fmt(c.endsAt)}</td>
                <td className="px-4 py-3">
                  {isLive(c) ? (
                    <span className="text-xs font-medium text-success bg-success/10 rounded px-2 py-0.5">Live</span>
                  ) : (
                    <span className="text-xs font-medium text-text-muted bg-surface-alt rounded px-2 py-0.5">{c.isActive ? 'Scheduled' : 'Inactive'}</span>
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

function CampaignForm({
  campaign, products, onSaved, onCancel,
}: {
  campaign?: Campaign;
  products: Product[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName]               = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [discount, setDiscount]       = useState(campaign ? String(Number(campaign.discountPercent)) : '');
  const [startsAt, setStartsAt]       = useState<Date | null>(campaign?.startsAt ? new Date(campaign.startsAt) : null);
  const [endsAt, setEndsAt]           = useState<Date | null>(campaign?.endsAt ? new Date(campaign.endsAt) : null);
  const [isActive, setIsActive]       = useState(campaign?.isActive ?? true);
  const [selected, setSelected]       = useState<Set<number>>(new Set(campaign?.productIds ?? []));
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
    const pct = parseFloat(discount);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) { toast.error('Discount must be between 0 and 100.'); return; }
    if (startsAt && endsAt && endsAt < startsAt) { toast.error('End must be after start.'); return; }

    const body = {
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
      discountPercent: pct,
      startsAt: startsAt ? startsAt.toISOString() : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
      isActive,
      productIds: Array.from(selected),
    };

    setSaving(true);
    try {
      if (campaign) await adminCampaignsApi.update(token, campaign.id, body);
      else await adminCampaignsApi.create(token, body);
      toast.success(campaign ? 'Campaign updated.' : 'Campaign created.');
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
            placeholder="Summer Sale" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Discount % *</label>
          <input value={discount} onChange={(e) => setDiscount(e.target.value)} required type="number" min={0.01} max={100} step="0.01"
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text"
            placeholder="20" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text"
          placeholder="Optional note shown internally" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Starts at</label>
          <DatePicker value={startsAt} onChange={setStartsAt} withTime placeholder="No start (immediate)" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Ends at</label>
          <DatePicker value={endsAt} onChange={setEndsAt} withTime placeholder="No end (open-ended)" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand" />
        Active (uncheck to pause without deleting)
      </label>

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
        <Button type="submit" size="sm" loading={saving}>{campaign ? 'Save changes' : 'Create campaign'}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
