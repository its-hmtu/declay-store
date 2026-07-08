import type { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = { title: 'Reset Password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-text">Reset your password</h1>
          <p className="text-text-muted mt-2">Choose a new password for your account</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <ResetPasswordClient token={token ?? ''} />
        </div>
      </div>
    </div>
  );
}
