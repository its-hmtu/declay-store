import type { Metadata } from 'next';
import EditProductClient from './EditProductClient';

export const metadata: Metadata = { title: 'Edit Product' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProductClient productId={Number(id)} />;
}
