'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/LocaleProvider';
import AccountSidebar from './AccountSidebar';

/**
 * M-32: khung khu vực Tài khoản — breadcrumb + sidebar nhóm + nội dung.
 * Dùng chung cho mọi route /account/* qua layout.
 */
export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <nav className="mb-5 text-sm text-text-muted">
        <Link href="/" className="hover:text-text">{t('accountNav.home')}</Link>
        <span className="mx-2 text-border-strong">·</span>
        <span className="text-text">{t('accountNav.account')}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[210px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-6"><AccountSidebar /></div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
