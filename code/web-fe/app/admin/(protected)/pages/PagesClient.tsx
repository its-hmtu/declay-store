'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Page, PageVersion } from '@/lib/types';
import { adminPagesApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PagesClient() {
  const [pages, setPages]       = useState<Page[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Page | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminPagesApi.list(token);
      setPages(res.data);
    } catch { toast.error('Failed to load pages.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await adminPagesApi.remove(token, id);
      toast.success('Page deleted.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
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
        <h1 className="font-serif text-3xl font-bold text-text">Pages</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Page
        </Button>
      </div>

      <p className="text-sm text-text-muted mb-5">
        Static/legal pages (Terms, Policies…). Content supports HTML and is versioned on every save.
      </p>

      {showForm && (
        <PageForm
          page={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Version</th>
              <th className="px-4 py-3 text-left">Effective</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pages.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No pages yet.</td></tr>
            ) : pages.map((p) => (
              <tr key={p.id} className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-4 py-3"><code className="text-text">/{p.slug}</code></td>
                <td className="px-4 py-3 text-text">{p.title}</td>
                <td className="px-4 py-3"><Badge variant={p.isPublished ? 'success' : 'default'}>{p.isPublished ? 'Published' : 'Draft'}</Badge></td>
                <td className="px-4 py-3 text-text-muted">v{p.version}</td>
                <td className="px-4 py-3 text-text-muted">{p.effectiveDate ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="p-2 text-text-muted hover:text-brand" aria-label="Open public page"><ExternalLink size={14} /></a>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setShowForm(true); }}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 size={14} /></Button>
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

function PageForm({ page, onSaved, onCancel }: { page?: Page; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!page;
  const [form, setForm] = useState({
    slug:          page?.slug ?? '',
    title:         page?.title ?? '',
    body:          page?.body ?? '',
    effectiveDate: page?.effectiveDate ?? '',
    isPublished:   page?.isPublished ?? false,
  });
  const [loading, setLoading]   = useState(false);
  const [versions, setVersions] = useState<PageVersion[] | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required.'); return; }
    setLoading(true);
    try {
      if (page) {
        await adminPagesApi.update(token, page.id, {
          title: form.title,
          body: form.body,
          effectiveDate: form.effectiveDate || null,
          isPublished: form.isPublished,
        });
        toast.success('Page updated.');
      } else {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
          toast.error('Slug must be lowercase words separated by hyphens.');
          setLoading(false);
          return;
        }
        await adminPagesApi.create(token, {
          slug: form.slug,
          title: form.title,
          body: form.body,
          effectiveDate: form.effectiveDate || null,
          isPublished: form.isPublished,
        });
        toast.success('Page created.');
      }
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions() {
    if (!page) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminPagesApi.versions(token, page.id);
      setVersions(res.data);
    } catch { toast.error('Failed to load history.'); }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={save} className="mb-6 p-5 rounded-xl border border-brand-lighter bg-brand-faint space-y-4">
      <h3 className="font-medium text-text">{isEdit ? `Edit Page — /${form.slug}` : 'New Page'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Slug {isEdit && <span className="text-text-faint">(fixed)</span>}</label>
          <input
            value={form.slug} disabled={isEdit}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className={`${inputCls} ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="terms"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Terms & Conditions" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Effective date</label>
          <input type="date" value={form.effectiveDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} className={inputCls} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-brand" />
          <span className="text-sm text-text">Published</span>
        </label>
      </div>
      <div>
        <label className="block text-xs font-medium text-text mb-1">Body (HTML supported)</label>
        <textarea
          value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={14} className={`${inputCls} font-mono`} placeholder="<h2>Section title</h2> <p>Paragraph…</p>"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {isEdit && <Button type="button" size="sm" variant="ghost" onClick={loadVersions}>Version history</Button>}
      </div>
      {versions && (
        <div className="mt-2 rounded-lg border border-border bg-surface p-3 text-xs">
          <p className="font-medium text-text mb-2">History ({versions.length})</p>
          <ul className="space-y-1">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-text-muted">
                <span className="font-mono">v{v.version}</span>
                <span>{new Date(v.createdAt).toLocaleString()}</span>
                <Badge variant={v.isPublished ? 'success' : 'default'}>{v.isPublished ? 'Published' : 'Draft'}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
