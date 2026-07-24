'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import { DatePicker } from '@/components/ui/date-picker';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import GoogleSignInButton from '@/components/storefront/GoogleSignInButton';
import { COUNTRY_CODES, type CountryCode } from '@/lib/countryCodes';
import CountrySelect from '@/components/storefront/CountrySelect';

const inputClass =
  'w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'At least 1 uppercase letter (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'At least 1 number (0–9)', test: (v: string) => /[0-9]/.test(v) },
];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RegisterClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '',
  });
  const [country, setCountry]         = useState<CountryCode>(COUNTRY_CODES[0]);
  const [showPassword, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(form.password) })),
    [form.password],
  );
  const passwordValid  = passwordChecks.every((c) => c.ok);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const canSubmit      = agreed && passwordValid && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid)                        { toast.error('Password does not meet the requirements.'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (!agreed)                               { toast.error('You must agree to the Terms & Conditions.'); return; }

    setLoading(true);
    try {
      const phoneDigits = form.phone.replace(/\D/g, '');
      const { data } = await authApi.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phoneNumber: phoneDigits ? `${country.dial} ${phoneDigits}` : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      auth.setTokens(data.accessToken, data.refreshToken);
      toast.success('Account created!');
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Full name */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="fullName">Full Name</label>
        <input
          id="fullName" name="fullName" required
          value={form.fullName} onChange={handleChange}
          className={inputClass} placeholder="Jane Doe"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="email">Email</label>
        <input
          id="email" name="email" type="email" required autoComplete="email"
          value={form.email} onChange={handleChange}
          className={inputClass} placeholder="you@example.com"
        />
      </div>

      {/* Phone with country prefix */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="phone">Phone Number</label>
        <div className="flex gap-2">
          <CountrySelect value={country} onChange={setCountry} />
          <input
            id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
            value={form.phone} onChange={handleChange}
            className={inputClass} placeholder="912 345 678"
          />
        </div>
      </div>

      {/* Date of birth */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="dateOfBirth">Date of Birth</label>
        <DatePicker
          id="dateOfBirth"
          value={form.dateOfBirth ? new Date(`${form.dateOfBirth}T00:00:00`) : null}
          onChange={(d) => setForm((f) => ({ ...f, dateOfBirth: d ? toYMD(d) : '' }))}
          placeholder="Select your date of birth"
          maxDate={new Date()}
          fromYear={1920}
          toYear={new Date().getFullYear()}
        />
      </div>

      {/* Password + toggle + live rules */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="password">Password</label>
        <div className="relative">
          <input
            id="password" name="password" required autoComplete="new-password"
            type={showPassword ? 'text' : 'password'}
            value={form.password} onChange={handleChange}
            className={`${inputClass} pr-11`} placeholder="••••••••"
          />
          <button
            type="button" onClick={() => setShowPass((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-faint hover:text-text"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {passwordChecks.map((c) => (
            <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-success' : 'text-text-faint'}`}>
              {c.ok ? <Check size={14} /> : <X size={14} />}
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Confirm password + toggle */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
        <div className="relative">
          <input
            id="confirmPassword" name="confirmPassword" required autoComplete="new-password"
            type={showConfirm ? 'text' : 'password'}
            value={form.confirmPassword} onChange={handleChange}
            className={`${inputClass} pr-11`} placeholder="••••••••"
          />
          <button
            type="button" onClick={() => setShowConfirm((s) => !s)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-faint hover:text-text"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {form.confirmPassword.length > 0 && !passwordsMatch && (
          <p className="mt-1.5 text-xs text-error">Passwords do not match.</p>
        )}
      </div>

      {/* Terms & conditions */}
      <label className="flex items-start gap-2.5 text-sm text-text-muted cursor-pointer select-none">
        <input
          type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand"
        />
        <span>
          I have read and agree to the{' '}
          <Link href="/terms" target="_blank" className="text-brand hover:underline font-medium">Terms &amp; Conditions</Link>{' '}
          and{' '}
          <Link href="/policies" target="_blank" className="text-brand hover:underline font-medium">Store Policies</Link>.
        </span>
      </label>

      <Button type="submit" loading={loading} disabled={!canSubmit} className="w-full">Create Account</Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-2 bg-surface text-xs text-text-faint">or</span>
        </div>
      </div>

      <GoogleSignInButton label="Continue with Google" />

      <p className="text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-brand hover:underline font-medium">Log in</Link>
      </p>
    </form>
  );
}
