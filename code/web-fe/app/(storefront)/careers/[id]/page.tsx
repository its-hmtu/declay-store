import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { jobsApi } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import ApplyForm from './ApplyForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data } = await jobsApi.detail(Number(id));
    return { title: `${data.title} — Careers` };
  } catch {
    return { title: 'Job not found' };
  }
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let job: Awaited<ReturnType<typeof jobsApi.detail>>['data'];
  try {
    const res = await jobsApi.detail(Number(id));
    job = res.data;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }

  if (!job.isOpen) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-text-muted">This position is no longer open.</p>
        <Link href="/careers" className="mt-4 inline-block text-brand hover:underline">Back to careers</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/careers" className="text-sm text-brand hover:underline mb-6 inline-block">
        &larr; All positions
      </Link>

      <h1 className="font-serif text-4xl font-bold text-text">{job.title}</h1>
      {job.location && (
        <p className="text-text-muted mt-1">{job.location}</p>
      )}

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-3">About the role</h2>
          <p className="text-text-muted leading-relaxed whitespace-pre-line">{job.description}</p>
        </section>

        {job.requirements && (
          <section>
            <h2 className="font-serif text-xl font-semibold text-text mb-3">Requirements</h2>
            <p className="text-text-muted leading-relaxed whitespace-pre-line">{job.requirements}</p>
          </section>
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="font-serif text-2xl font-semibold text-text mb-6">Apply for this role</h2>
        <ApplyForm jobId={job.id} />
      </div>
    </div>
  );
}
