import type { Metadata } from 'next';
import AdminProductsClient from './AdminProductsClient';

export const metadata: Metadata = { title: 'Products' };

export default function AdminProductsPage() {
  return <AdminProductsClient />;
}
