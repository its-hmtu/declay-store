'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Job } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import FilterBar from '@/components/admin/FilterBar';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminJobsClient() {
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('all');

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Job[]>('/admin/jobs?limit=100', { token });
      setJobs(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => jobs.filter((j) =>
    (search === '' || j.title.toLowerCase().includes(search.toLowerCase()) || (j.location ?? '').toLowerCase().includes(search.toLowerCase())) &&
    (status === 'all' || (status === 'open' ? j.isOpen : !j.isOpen)),
  ), [jobs, search, status]);

  const { page, setPage, totalPages, total, paged } = usePagination(filtered, 10);

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

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search jobs…"
        fields={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All status' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] }]}
        values={{ status }}
        onValuesChange={(v) => setStatus(v.status)}
        onApplied={() => setPage(1)}
      />

      <Card className="overflow-hidden py-0">
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
            {paged.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No jobs found.</td></tr>
            ) : (
              paged.map((job) => (
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
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
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

  return (
    <Card className="mb-6 p-5 py-5 border-brand-lighter bg-brand-faint">
      <form onSubmit={save} className="space-y-4">
        <h3 className="font-medium text-text">{isEdit ? 'Edit Job' : 'New Job Listing'}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">Title *</Label>
            <Input name="title" required value={form.title} onChange={handleChange} placeholder="Studio Artist" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Location</Label>
            <Input name="location" value={form.location} onChange={handleChange} placeholder="Remote / Ho Chi Minh City" />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Description *</Label>
          <Textarea name="description" required rows={4} value={form.description} onChange={handleChange}  className="resize-none" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Requirements</Label>
          <Textarea name="requirements" rows={3} value={form.requirements} onChange={handleChange}  className="resize-none" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-isopen" checked={form.isOpen} onCheckedChange={(v) => setForm((f) => ({ ...f, isOpen: v === true }))} />
          <Label htmlFor="cb-isopen" className="text-sm text-text cursor-pointer font-normal">Open for applications</Label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
