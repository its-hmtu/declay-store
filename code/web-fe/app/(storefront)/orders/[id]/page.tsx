import type { Metadata } from 'next';
import OrderDetailClient from './OrderDetailClient';

export const metadata: Metadata = { title: 'Order Details' };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailClient orderId={Number(id)} />;
}
