import { Suspense } from 'react';
import VnpayReturnClient from './VnpayReturnClient';

export const metadata = { title: 'Payment result', robots: { index: false, follow: false } };

export default function VnpayReturnPage() {
  return (
    <Suspense fallback={null}>
      <VnpayReturnClient />
    </Suspense>
  );
}
