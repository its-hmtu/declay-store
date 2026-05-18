'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import GoogleSignInButton from '@/components/storefront/GoogleSignInButton';

export default function LoginClient() {
  const router = useRouter();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form.email, form.password);
      auth.setTokens(data.accessToken, data.refreshToken);
      toast.success('Logged in!');
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="email">Email</label>
        <input
          id="email" name="email" type="email" required
          value={form.email} onChange={handleChange}
          autoComplete="email"
          className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="password">Password</label>
        <input
          id="password" name="password" type="password" required
          value={form.password} onChange={handleChange}
          autoComplete="current-password"
          className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
          placeholder="••••••••"
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">Log In</Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-text-faint bg-surface px-2">
          <span className="px-2 bg-surface">or</span>
        </div>
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand hover:underline font-medium">Register</Link>
      </p>
    </form>
  );
}
