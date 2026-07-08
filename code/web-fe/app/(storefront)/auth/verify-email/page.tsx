import type { Metadata } from 'next';
import VerifyEmailClient from './VerifyEmailClient';

export const metadata: Metadata = { title: 'Verify Email' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-text">Email verification</h1>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <VerifyEmailClient token={token ?? ''} />
        </div>
      </div>
    </div>
  );
}
