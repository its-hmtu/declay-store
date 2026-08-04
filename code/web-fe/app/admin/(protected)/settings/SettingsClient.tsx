'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { SiteSetting } from '@/lib/types';
import { adminSettingsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';

interface Row { key: string; value: string }

export default function SettingsClient() {
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminSettingsApi.list(token);
      setRows(res.data.map((s: SiteSetting) => ({ key: s.key, value: s.value ?? '' })));
    } catch { toast.error('Failed to load settings.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update(i: number, field: keyof Row, val: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  }
  function addRow()      { setRows((r) => [...r, { key: '', value: '' }]); }
  function removeRow(i: number) { setRows((r) => r.filter((_, idx) => idx !== i)); }

  async function save() {
    const token = adminAuth.getToken();
    if (!token) return;
    const settings: Record<string, string | null> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (!key) continue;
      if (!/^[a-zA-Z0-9._-]+$/.test(key)) { toast.error(`Invalid key: "${key}"`); return; }
      settings[key] = row.value === '' ? null : row.value;
    }
    if (Object.keys(settings).length === 0) { toast.error('Add at least one setting.'); return; }
    setSaving(true);
    try {
      await adminSettingsApi.save(token, settings);
      toast.success('Settings saved.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      <div className="rounded-xl border border-border bg-surface p-8">
        <Skeleton className="h-4 w-64 mb-2" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-3xl font-bold text-text">Site Settings</h1>
        <Button size="sm" loading={saving} onClick={save}><Save size={15} /> Save all</Button>
      </div>
      <p className="text-sm text-text-muted mb-6">
        Keys prefixed with <code className="font-mono">public.</code> are exposed to the storefront. Leave a value empty to clear it.
      </p>

      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="grid grid-cols-[1fr_1.5fr_auto] gap-3 text-xs uppercase tracking-wider text-text-muted px-1">
          <span>Key</span><span>Value</span><span />
        </div>
        {rows.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No settings yet. Add one below.</p>}
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-3 items-center">
            <input value={row.key} onChange={(e) => update(i, 'key', e.target.value)} placeholder="public.site_name" className={`${inputCls} font-mono`} />
            <input value={row.value} onChange={(e) => update(i, 'value', e.target.value)} placeholder="Declay Store" className={inputCls} />
            <button onClick={() => removeRow(i)} className="p-2 text-text-faint hover:text-error transition-colors" aria-label="Remove"><Trash2 size={15} /></button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addRow}><Plus size={14} /> Add setting</Button>
      </div>
    </div>
  );
}
