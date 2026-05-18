import type { Metadata } from 'next';
import JobApplicationsClient from './JobApplicationsClient';

export const metadata: Metadata = { title: 'Job Applications' };

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobApplicationsClient jobId={Number(id)} />;
}
