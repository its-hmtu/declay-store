'use client';

import { use } from 'react';
import OrderDetailClient from '@/app/(storefront)/orders/[id]/OrderDetailClient';

// M-31: /account/orders/:id — chi tiết đơn, hiển thị trong layout Account.
export default function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrderDetailClient orderId={Number(id)} embedded />;
}
