'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailClient({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? 'loading' : 'error');

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi.verifyEmail(token)
      .then(() => { if (active) setState('success'); })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [token]);

  if (state === 'loading') {
    return <p className="text-center text-text-muted">Verifying your email…</p>;
  }
  if (state === 'success') {
    return (
      <div className="text-center space-y-3">
        <p className="text-text font-medium">Your email has been verified.</p>
        <Link href="/login" className="inline-block text-brand hover:underline text-sm font-medium">Continue to log in</Link>
      </div>
    );
  }
  return (
    <div className="text-center space-y-3">
      <p className="text-error font-medium">We couldn&apos;t verify your email.</p>
      <p className="text-sm text-text-muted">The link may be invalid or has expired.</p>
      <Link href="/login" className="inline-block text-brand hover:underline text-sm font-medium">Back to log in</Link>
    </div>
  );
}
