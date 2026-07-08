'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function ForgotPasswordClient() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <p className="text-text">
          If an account exists for <span className="font-medium">{email}</span>, a reset link has been sent.
        </p>
        <p className="text-sm text-text-muted">Check your inbox and spam folder.</p>
        <Link href="/login" className="inline-block text-brand hover:underline text-sm font-medium">Back to log in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="email">Email</label>
        <input
          id="email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
      <p className="text-center text-sm text-text-muted">
        Remember your password?{' '}
        <Link href="/login" className="text-brand hover:underline font-medium">Log in</Link>
      </p>
    </form>
  );
}
