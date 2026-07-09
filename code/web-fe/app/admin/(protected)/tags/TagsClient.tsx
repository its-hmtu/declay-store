'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tag } from '@/lib/types';
import { adminTagsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function TagsClient() {
  const [tags, setTags]         = useState<Tag[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Tag | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try { setTags((await adminTagsApi.list(token)).data); }
    catch { toast.error('Failed to load tags.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this tag?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try { await adminTagsApi.remove(token, id); toast.success('Deleted.'); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Delete failed.'); }
  }

  if (loading) return <div className="text-text-muted">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Tags</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Tag
        </Button>
      </div>

      {showForm && (
        <TagForm
          tag={editing ?? undefined}
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tags.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-text-muted">No tags yet.</td></tr>
            ) : tags.map((t) => (
              <tr key={t.id} className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-4 py-3 text-text">{t.name}</td>
                <td className="px-4 py-3 text-text-muted"><code>{t.slug}</code></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setShowForm(true); }}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(t.id)}><Trash2 size={14} /></Button>
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

function TagForm({ tag, onSaved, onCancel }: { tag?: Tag; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!tag;
  const [name, setName] = useState(tag?.name ?? '');
  const [slug, setSlug] = useState(tag?.slug ?? '');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    if (!name.trim()) { toast.error('Name is required.'); return; }
    setLoading(true);
    const body = { name, ...(slug.trim() ? { slug: slug.trim() } : {}) };
    try {
      if (tag) await adminTagsApi.update(token, tag.id, body);
      else     await adminTagsApi.create(token, body);
      toast.success(isEdit ? 'Tag updated.' : 'Tag created.');
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
      <h3 className="font-medium text-text">{isEdit ? 'Edit Tag' : 'New Tag'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Handmade" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Slug <span className="text-text-faint">(optional)</span></label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} placeholder="auto from name" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
