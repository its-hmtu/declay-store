'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Job } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminJobsClient() {
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Job[]>('/admin/jobs', { token });
      setJobs(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteJob(id: number) {
    if (!confirm('Delete this job listing?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await api.delete(`/admin/jobs/${id}`, { token });
      toast.success('Job deleted.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (loading) return <div className="text-text-muted">Loading jobs…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Jobs</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Job
        </Button>
      </div>

      {showForm && (
        <JobForm
          job={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No job listings yet.</td></tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{job.title}</td>
                  <td className="px-4 py-3 text-text-muted">{job.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={job.isOpen ? 'success' : 'default'}>{job.isOpen ? 'Open' : 'Closed'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{new Date(job.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm"><Pencil size={14} /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => deleteJob(job.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobForm({ job, onSaved, onCancel }: { job?: Job; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!job;
  const [form, setForm] = useState({
    title:        job?.title        ?? '',
    description:  job?.description  ?? '',
    requirements: job?.requirements ?? '',
    location:     job?.location     ?? '',
    isOpen:       job?.isOpen       ?? true,
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      if (isEdit) { await api.put(`/admin/jobs/${job.id}`, form, { token }); }
      else        { await api.post('/admin/jobs', form, { token }); }
      toast.success(isEdit ? 'Job updated.' : 'Job created.');
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
      <h3 className="font-medium text-text">{isEdit ? 'Edit Job' : 'New Job Listing'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Title *</label>
          <input name="title" required value={form.title} onChange={handleChange} className={inputCls} placeholder="Studio Artist" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Location</label>
          <input name="location" value={form.location} onChange={handleChange} className={inputCls} placeholder="Remote / Ho Chi Minh City" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text mb-1">Description *</label>
        <textarea name="description" required rows={4} value={form.description} onChange={handleChange} className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-text mb-1">Requirements</label>
        <textarea name="requirements" rows={3} value={form.requirements} onChange={handleChange} className={`${inputCls} resize-none`} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="isOpen" checked={form.isOpen} onChange={handleChange} className="w-4 h-4 accent-brand" />
        <span className="text-sm text-text">Open for applications</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
