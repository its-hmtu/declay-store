import type { Metadata } from 'next';
import { Suspense } from 'react';
import ThankYouClient from './ThankYouClient';

export const metadata: Metadata = {
  title: 'Cảm ơn bạn!',
  // Trang này chứa nội dung đơn hàng — không cho công cụ tìm kiếm lập chỉ mục.
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <Suspense fallback={null}>
      <ThankYouClient />
    </Suspense>
  );
}
