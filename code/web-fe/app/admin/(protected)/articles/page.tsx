import type { Metadata } from 'next';
import AdminArticlesClient from './AdminArticlesClient';

export const metadata: Metadata = { title: 'Articles' };

export default function AdminArticlesPage() {
  return <AdminArticlesClient />;
}
