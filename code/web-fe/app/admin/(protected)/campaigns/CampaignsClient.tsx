'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Campaign, CampaignImpact, Product } from '@/lib/types';
import { adminCampaignsApi, productsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

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

      <Card className="overflow-hidden py-0">
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
      </Card>
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
  // M-41: dry-run the pricing damage while the admin is still editing.
  const [impact, setImpact]           = useState<CampaignImpact | null>(null);

  const pctNumber = parseFloat(discount);
  const selectedKey = Array.from(selected).sort((a, b) => a - b).join(',');

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token || !selected.size || !Number.isFinite(pctNumber) || pctNumber <= 0 || pctNumber > 100) {
      setImpact(null);
      return;
    }
    // Debounced so typing "35" does not fire a request for "3".
    const timer = setTimeout(() => {
      adminCampaignsApi
        .previewImpact(token, {
          productIds: Array.from(selected),
          discountPercent: pctNumber,
          startsAt: startsAt ? startsAt.toISOString() : null,
          endsAt: endsAt ? endsAt.toISOString() : null,
          excludeCampaignId: campaign?.id,
        })
        .then((res) => setImpact(res.data ?? null))
        .catch(() => setImpact(null)); // advisory only — never block the form
    }, 400);
    return () => clearTimeout(timer);
    // `discount` (the raw string), not `pctNumber` — an empty field parses to NaN,
    // and NaN !== NaN would make this effect re-fire on every single render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, discount, startsAt, endsAt, campaign?.id]);

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
    <Card className="mb-6 p-5 py-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={150}
              placeholder="Summer Sale" />
          </div>
          <div>
            <Label className="mb-1.5 block">Discount % *</Label>
            <Input value={discount} onChange={(e) => setDiscount(e.target.value)} required type="number" min={0.01} max={100} step="0.01"
              placeholder="20" />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
            placeholder="Optional note shown internally" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Starts at</Label>
            <DatePicker value={startsAt} onChange={setStartsAt} withTime placeholder="No start (immediate)" />
          </div>
          <div>
            <Label className="mb-1.5 block">Ends at</Label>
            <DatePicker value={endsAt} onChange={setEndsAt} withTime placeholder="No end (open-ended)" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-text">
          <Checkbox id="cb-isactive" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          <Label htmlFor="cb-isactive" className="cursor-pointer font-normal">Active (uncheck to pause without deleting)</Label>
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

        {/* M-41: advisory only — these never block saving. The shop owner decides
            whether a loss-leader is worth it; our job is to make sure it is a decision
            and not an accident. */}
        {impact && (impact.warnings.length > 0 || impact.overlaps.length > 0) && (
          <div className="space-y-3">
            {impact.summary.belowCost > 0 && (
              <div className="rounded-lg border border-error/40 bg-error/5 p-3">
                <p className="text-sm font-semibold text-error">
                  {impact.summary.belowCost} variant{impact.summary.belowCost > 1 ? 's' : ''} would sell BELOW COST at {pctNumber}%
                </p>
                <ul className="mt-2 space-y-1 text-xs text-text-muted max-h-32 overflow-y-auto">
                  {impact.warnings.filter((w) => w.severity === 'below-cost').map((w) => (
                    <li key={w.variantId}>
                      {w.productName} — {w.variantName}: sells at {w.effectivePrice.toLocaleString('vi-VN')} ₫,
                      costs {w.costPrice.toLocaleString('vi-VN')} ₫
                      <span className="text-error font-medium"> (loses {Math.abs(w.margin).toLocaleString('vi-VN')} ₫/unit)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {impact.summary.thinMargin > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                <p className="text-sm font-medium text-text">
                  {impact.summary.thinMargin} variant{impact.summary.thinMargin > 1 ? 's' : ''} left with a margin under 10%
                </p>
              </div>
            )}

            {impact.overlaps.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-alt p-3">
                <p className="text-sm font-medium text-text">Overlaps an existing campaign</p>
                <p className="mt-1 text-xs text-text-muted">
                  Some selected products are already covered in this period by{' '}
                  {[...new Set(impact.overlaps.map((o) => `${o.name} (-${o.discountPercent}%)`))].join(', ')}.
                  The deepest discount wins — the other campaign will have no effect on those products.
                </p>
              </div>
            )}

            {impact.variantsWithoutCost > 0 && (
              <p className="text-xs text-text-faint">
                {impact.variantsWithoutCost} variant{impact.variantsWithoutCost > 1 ? 's have' : ' has'} no cost price recorded,
                so margin could not be checked for {impact.variantsWithoutCost > 1 ? 'them' : 'it'}.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" loading={saving}>{campaign ? 'Save changes' : 'Create campaign'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
