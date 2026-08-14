'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/LocaleProvider';
import { auth } from '@/lib/auth';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';
import ProfileSection from '@/components/storefront/account/ProfileSection';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';

export default function ProfilePage() {
  const { t } = useT();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { router.push('/login?next=/account/profile'); return; }
    userApi.getInfo(token)
      .then((res) => setUser(res.data))
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </section>
  );
  if (!user) return <div className="text-text-muted">{t('account.loadFailed')}</div>;

  return (
    <>
      <ProfileSection user={user} onUpdated={setUser} />
    </>
  );
}
