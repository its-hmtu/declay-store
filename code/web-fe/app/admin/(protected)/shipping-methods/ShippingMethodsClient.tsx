'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ShippingMethod } from '@/lib/types';
import { adminShippingMethodsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';

export default function ShippingMethodsClient() {
  const [methods, setMethods]   = useState<ShippingMethod[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<ShippingMethod | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try { setMethods((await adminShippingMethodsApi.list(token)).data); }
    catch { toast.error('Failed to load shipping methods.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this shipping method?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try { await adminShippingMethodsApi.remove(token, id); toast.success('Deleted.'); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Delete failed.'); }
  }

  if (loading) return <div className="text-text-muted">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Shipping Methods</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Method
        </Button>
      </div>

      {showForm && (
        <MethodForm
          method={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Zone</th>
              <th className="px-4 py-3 text-left">Fee</th>
              <th className="px-4 py-3 text-left">Free over</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {methods.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No shipping methods yet.</td></tr>
            ) : methods.map((m) => (
              <tr key={m.id} className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-4 py-3 text-text">{m.name}</td>
                <td className="px-4 py-3 text-text-muted">{m.zone}</td>
                <td className="px-4 py-3 text-text-muted">{formatPrice(Number(m.fee))}</td>
                <td className="px-4 py-3 text-text-muted">{m.freeOver != null ? `${formatPrice(Number(m.freeOver))}` : '—'}</td>
                <td className="px-4 py-3"><Badge variant={m.isActive ? 'success' : 'default'}>{m.isActive ? 'Active' : 'Hidden'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setShowForm(true); }}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MethodForm({ method, onSaved, onCancel }: { method?: ShippingMethod; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!method;
  const [form, setForm] = useState({
    name:          method?.name ?? '',
    description:   method?.description ?? '',
    zone:          method?.zone ?? 'all',
    fee:           method?.fee != null ? String(method.fee) : '0',
    freeOver:      method?.freeOver != null ? String(method.freeOver) : '',
    estimatedDays: method?.estimatedDays ?? '',
    isActive:      method?.isActive ?? true,
    sortOrder:     method?.sortOrder != null ? String(method.sortOrder) : '0',
  });
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setLoading(true);
    const body = {
      name: form.name,
      description: form.description || null,
      zone: form.zone,
      fee: Number(form.fee) || 0,
      freeOver: form.freeOver.trim() === '' ? null : Number(form.freeOver),
      estimatedDays: form.estimatedDays || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (method) await adminShippingMethodsApi.update(token, method.id, body);
      else        await adminShippingMethodsApi.create(token, body);
      toast.success(isEdit ? 'Method updated.' : 'Method created.');
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
      <h3 className="font-medium text-text">{isEdit ? 'Edit Method' : 'New Method'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Standard Shipping" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Zone</label>
          <select value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value as ShippingMethod['zone'] }))} className={inputCls}>
            <option value="all">All</option>
            <option value="domestic">Domestic (Vietnam)</option>
            <option value="international">International</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Fee (USD)</label>
          <input type="number" min="0" step="0.01" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Free over (optional)</label>
          <input type="number" min="0" step="0.01" value={form.freeOver} onChange={(e) => setForm((f) => ({ ...f, freeOver: e.target.value }))} className={inputCls} placeholder="e.g. 75" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Estimated days</label>
          <input value={form.estimatedDays} onChange={(e) => setForm((f) => ({ ...f, estimatedDays: e.target.value }))} className={inputCls} placeholder="3–5 business days" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Sort order</label>
          <input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text mb-1">Description</label>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Tracked delivery" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-brand" />
        <span className="text-sm text-text">Active</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
