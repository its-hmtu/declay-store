'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';

export default function OAuthCallbackClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const handled      = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const accessToken  = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error        = searchParams.get('error');

    if (error || !accessToken || !refreshToken) {
      toast.error('Google sign-in failed. Please try again.');
      router.replace('/login');
      return;
    }

    auth.setTokens(accessToken, refreshToken);
    toast.success('Signed in with Google!');

    const returnTo = searchParams.get('returnTo') ?? '/';
    router.replace(returnTo);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-3">
        <span className="inline-block size-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
