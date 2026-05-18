import type { Metadata } from 'next';
import OrdersClient from './OrdersClient';

export const metadata: Metadata = { title: 'My Orders' };

export default function OrdersPage() {
  return <OrdersClient />;
}
