'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';
import AssistantWidget from '@/components/admin/AssistantWidget';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
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
    <div className="flex flex-1 overflow-hidden bg-surface min-h-0">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-2">
          <Breadcrumbs />
          <NotificationBell variant="admin" />
        </div>
        {children}
      </main>
      <AssistantWidget />
    </div>
  );
}
