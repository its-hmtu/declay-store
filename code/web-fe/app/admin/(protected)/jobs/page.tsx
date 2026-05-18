import type { Metadata } from 'next';
import AdminJobsClient from './AdminJobsClient';

export const metadata: Metadata = { title: 'Jobs' };

export default function AdminJobsPage() {
  return <AdminJobsClient />;
}
