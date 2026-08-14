'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';
import AssistantWidget from '@/components/admin/AssistantWidget';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import SessionExpiredDialog from '@/components/admin/SessionExpiredDialog';
import NotificationBell from '@/components/NotificationBell';
import { adminAuth } from '@/lib/auth';
import { adminAuthApi } from '@/lib/api';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // 'checking' cho tới khi biết chắc: có access, hoặc refresh xong, hoặc phải login.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (adminAuth.isLoggedIn()) { setReady(true); return; }
      // M-25: access token (và cookie 8h) đã hết hạn. Nếu còn refresh token thì
      // gia hạn NGAY khi tải trang, thay vì đá về login rồi bắt đăng nhập lại.
      const refresh = adminAuth.getRefreshToken();
      if (refresh) {
        try {
          const { data } = await adminAuthApi.refresh(refresh);
          adminAuth.setTokens(data.accessToken, data.refreshToken);
          if (!cancelled) setReady(true);
          return;
        } catch {
          // refresh hỏng/hết hạn -> dọn và về login
          adminAuth.clearToken();
        }
      }
      if (!cancelled) router.replace('/admin/login');
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />

      {/**
       * M-48: the sidebar is `fixed`, so the content pads past it rather than
       * sitting in a flex row. Full width — admin tables have many columns now
       * (created, updated, campaign windows) and a centred max-width just forced
       * horizontal scrolling on data that had room to breathe.
       */}
      <main className="min-h-screen w-full pl-56">
        <div className="px-6 py-6 md:px-8">
          <div className="mb-2 flex items-start justify-between gap-4">
            <Breadcrumbs />
            <NotificationBell variant="admin" />
          </div>
          {children}
        </div>
      </main>

      <AssistantWidget />
      {/* Global: any admin request can be the one that discovers the session died. */}
      <SessionExpiredDialog />
    </div>
  );
}
