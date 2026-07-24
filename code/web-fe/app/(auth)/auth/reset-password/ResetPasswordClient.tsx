'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import Button from '@/components/ui/Button';

const inputClass =
  'w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'At least 1 uppercase letter (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'At least 1 number (0–9)', test: (v: string) => /[0-9]/.test(v) },
];

export default function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  const checks = useMemo(() => PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) })), [password]);
  const valid  = checks.every((c) => c.ok);
  const match  = confirm.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid)               { toast.error('Password does not meet the requirements.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset. Please log in.');
      router.push('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-error font-medium">Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-brand hover:underline text-sm font-medium">Request a new link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="password">New password</label>
        <div className="relative">
          <input
            id="password" required autoComplete="new-password"
            type={show ? 'text' : 'password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-11`} placeholder="••••••••"
          />
          <button
            type="button" onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-faint hover:text-text"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {checks.map((c) => (
            <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-success' : 'text-text-faint'}`}>
              {c.ok ? <Check size={14} /> : <X size={14} />}
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm" required autoComplete="new-password"
          type={show ? 'text' : 'password'}
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className={inputClass} placeholder="••••••••"
        />
        {confirm.length > 0 && !match && (
          <p className="mt-1.5 text-xs text-error">Passwords do not match.</p>
        )}
      </div>

      <Button type="submit" loading={loading} disabled={!valid || !match || loading} className="w-full">Reset password</Button>
      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="text-brand hover:underline font-medium">Back to log in</Link>
      </p>
    </form>
  );
}
