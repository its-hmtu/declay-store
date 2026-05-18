'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';
import { adminAuth } from '@/lib/auth';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!adminAuth.isLoggedIn()) {
      router.replace('/admin/login');
    }
  }, [router]);

  if (!adminAuth.isLoggedIn()) return null;

  return (
    <div className="flex flex-1 overflow-hidden bg-surface min-h-0">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
