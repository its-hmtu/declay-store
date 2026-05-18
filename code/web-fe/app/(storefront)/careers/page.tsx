import type { Metadata } from 'next';
import Link from 'next/link';
import { jobsApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';

export const metadata: Metadata = { title: 'Careers' };

export default async function CareersPage() {
  let jobs: Awaited<ReturnType<typeof jobsApi.list>>['data'] = [];
  try {
    const res = await jobsApi.list();
    jobs      = res.data;
  } catch { /* empty */ }

  const openJobs = jobs.filter((j) => j.isOpen);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="mb-12">
        <h1 className="font-serif text-5xl font-bold text-text mb-4">Join the Studio</h1>
        <p className="text-lg text-text-muted max-w-xl leading-relaxed">
          We&apos;re a small team of artists and makers. If you love craft, storytelling, and building something with
          your hands — or your code — we&apos;d love to hear from you.
        </p>
      </div>

      {/* Open positions */}
      <h2 className="font-serif text-2xl font-semibold text-text mb-5">Open Positions</h2>

      {openJobs.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-border bg-surface-alt text-text-muted">
          <p>No open positions at the moment. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {openJobs.map((job) => (
            <Link
              key={job.id}
              href={`/careers/${job.id}`}
              className="group flex items-center justify-between gap-4 p-5 rounded-xl border border-border bg-surface hover:border-brand-lighter transition-colors"
            >
              <div>
                <h3 className="font-serif font-semibold text-text group-hover:text-brand transition-colors">
                  {job.title}
                </h3>
                {job.location && (
                  <p className="text-sm text-text-muted mt-0.5">{job.location}</p>
                )}
              </div>
              <Badge variant="success">Open</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
