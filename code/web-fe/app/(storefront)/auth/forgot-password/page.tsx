import type { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata: Metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-text">Forgot your password?</h1>
          <p className="text-text-muted mt-2">We&apos;ll email you a reset link</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <ForgotPasswordClient />
        </div>
      </div>
    </div>
  );
}
