'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminAuthApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function AdminLoginClient() {
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
      const { data } = await adminAuthApi.login(form.email, form.password);
      adminAuth.setToken(data.accessToken);
      toast.success('Welcome back!');
      router.push('/admin/dashboard');
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
          placeholder="admin@declay.com"
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
      <Button type="submit" loading={loading} className="w-full">Sign In</Button>
    </form>
  );
}
