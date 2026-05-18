'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Job, JobApplication, ApplicationStatus } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Badge from '@/components/ui/Badge';

const STATUS_VARIANT: Record<ApplicationStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  received:  'default',
  reviewing: 'info',
  interview: 'warning',
  hired:     'success',
  rejected:  'error',
};

const STATUS_OPTS: ApplicationStatus[] = ['received', 'reviewing', 'interview', 'hired', 'rejected'];

export default function JobApplicationsClient({ jobId }: { jobId: number }) {
  const [job,          setJob]          = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading,      setLoading]      = useState(true);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const [jobRes, appRes] = await Promise.allSettled([
        api.get<Job>(`/admin/jobs/${jobId}`, { token }),
        api.get<JobApplication[]>(`/admin/jobs/${jobId}/applications`, { token }),
      ]);
      if (jobRes.status === 'fulfilled')  setJob(jobRes.value.data);
      if (appRes.status === 'fulfilled')  setApplications(appRes.value.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [jobId]);

  async function updateStatus(appId: number, status: ApplicationStatus) {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await api.patch(`/admin/jobs/${jobId}/applications/${appId}`, { status }, { token });
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
      toast.success('Status updated.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  if (loading) return <div className="text-text-muted">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/jobs" className="text-sm text-brand hover:underline">&larr; Jobs</Link>
          <h1 className="font-serif text-3xl font-bold text-text mt-1">
            {job?.title ?? 'Applications'}
          </h1>
          {job && (
            <p className="text-sm text-text-muted mt-0.5">
              {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-border bg-surface text-text-muted">
          No applications yet for this position.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="p-5 rounded-xl border border-border bg-surface">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-text">{app.applicantName}</p>
                  <p className="text-sm text-text-muted">{app.email}</p>
                  {app.cvUrl && (
                    <a href={app.cvUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline mt-0.5 inline-block">View CV</a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[app.status]}>{app.status}</Badge>
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value as ApplicationStatus)}
                    className="text-xs border border-border rounded-md px-2 py-1 bg-surface focus:outline-none focus:border-brand text-text"
                  >
                    {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {app.coverLetter && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Cover Letter</p>
                  <p className="text-sm text-text-muted leading-relaxed line-clamp-4">{app.coverLetter}</p>
                </div>
              )}
              <p className="text-xs text-text-faint mt-3">
                {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
