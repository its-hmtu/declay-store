import type { Metadata } from 'next';
import AdminOrdersClient from './AdminOrdersClient';

export const metadata: Metadata = { title: 'Orders' };

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
