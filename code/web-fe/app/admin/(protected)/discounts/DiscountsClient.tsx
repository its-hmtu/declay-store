'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DiscountCode } from '@/lib/types';
import { adminDiscountsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import FilterBar from '@/components/admin/FilterBar';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';
import { formatPrice } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function DiscountsClient() {
  const [codes,    setCodes]    = useState<DiscountCode[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<DiscountCode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('all');

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminDiscountsApi.list(token);
      setCodes(res.data);
    } catch { toast.error('Failed to load discounts.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => codes.filter((c) =>
    (search === '' || c.code.toLowerCase().includes(search.toLowerCase())) &&
    (status === 'all' || (status === 'active' ? c.isActive : !c.isActive)),
  ), [codes, search, status]);

  const { page, setPage, totalPages, total, paged } = usePagination(filtered, 10);

  async function remove(id: number) {
    if (!confirm('Delete this discount code?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await adminDiscountsApi.remove(token, id);
      toast.success('Discount deleted.');
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
        <h1 className="font-serif text-3xl font-bold text-text">Discounts</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Code
        </Button>
      </div>

      {showForm && (
        <DiscountForm
          discount={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by code…"
        fields={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }] }]}
        values={{ status }}
        onValuesChange={(v) => setStatus(v.status)}
        onApplied={() => setPage(1)}
      />

      <Card className="overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-left">Min order</th>
              <th className="px-4 py-3 text-left">Uses</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No discount codes found.</td></tr>
            ) : (
              paged.map((d) => (
                <tr key={d.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-text">{d.code}</td>
                  <td className="px-4 py-3 text-text">{d.type === 'percent' ? `${d.value}%` : `${formatPrice(Number(d.value))}`}</td>
                  <td className="px-4 py-3 text-text-muted">{d.minOrderAmount ? `${formatPrice(Number(d.minOrderAmount))}` : '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-text-muted">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={d.isActive ? 'success' : 'default'}>{d.isActive ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(d); setShowForm(true); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(d.id)}><Trash2 size={14} /></Button>
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

function DiscountForm({ discount, onSaved, onCancel }: { discount?: DiscountCode; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!discount;
  const [form, setForm] = useState({
    code:           discount?.code ?? '',
    type:           discount?.type ?? 'percent',
    value:          discount ? String(discount.value) : '',
    minOrderAmount: discount?.minOrderAmount ? String(discount.minOrderAmount) : '',
    maxUses:        discount?.maxUses ? String(discount.maxUses) : '',
    expiresAt:      discount?.expiresAt ? discount.expiresAt.slice(0, 10) : '',
    isActive:       discount?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    const body: Record<string, unknown> = {
      type: form.type,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
    };
    if (!isEdit) body.code = form.code; // code is immutable after creation
    try {
      if (isEdit) await adminDiscountsApi.update(token, discount.id, body);
      else        await adminDiscountsApi.create(token, body);
      toast.success(isEdit ? 'Discount updated.' : 'Discount created.');
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
        <h3 className="font-medium text-text">{isEdit ? `Edit ${discount.code}` : 'New Discount Code'}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">Code *</Label>
            <Input name="code" required disabled={isEdit} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER10"  className="font-mono disabled:opacity-60" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Type *</Label>
            <NativeSelect name="type" value={form.type} onChange={handleChange}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </NativeSelect>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Value *</Label>
            <Input name="value" required type="number" step="0.01" min="0" value={form.value} onChange={handleChange} placeholder={form.type === 'percent' ? '10' : '5.00'} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Min order ($)</Label>
            <Input name="minOrderAmount" type="number" step="0.01" min="0" value={form.minOrderAmount} onChange={handleChange} placeholder="0" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Max uses</Label>
            <Input name="maxUses" type="number" min="1" value={form.maxUses} onChange={handleChange} placeholder="Unlimited" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Expires</Label>
            <Input name="expiresAt" type="date" value={form.expiresAt} onChange={handleChange} />
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
