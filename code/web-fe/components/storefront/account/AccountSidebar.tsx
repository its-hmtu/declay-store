'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/LocaleProvider';

/**
 * M-32: điều hướng khu vực Tài khoản dạng NHÓM (tham khảo Home Depot Purchase
 * History). Mỗi nhóm có tiêu đề nhỏ + các mục; mục ứng với route hiện tại được
 * làm nổi bật. Chỉ liệt kê tính năng Declay thực có.
 */
const GROUPS: { titleKey: string; items: { href: string; labelKey: string }[] }[] = [
  {
    titleKey: 'accountNav.orders',
    items: [{ href: '/account/orders', labelKey: 'accountNav.myOrders' }],
  },
  {
    titleKey: 'accountNav.settings',
    items: [
      { href: '/account/profile', labelKey: 'accountNav.profile' },
      { href: '/account/addresses', labelKey: 'accountNav.addresses' },
      { href: '/account/password', labelKey: 'accountNav.password' },
    ],
  },
  {
    titleKey: 'accountNav.lists',
    items: [{ href: '/account/favorites', labelKey: 'accountNav.wishlist' }],
  },
];

export default function AccountSidebar() {
  const { t } = useT();
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.titleKey}>
          <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            {t(group.titleKey as Parameters<typeof t>[0])}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-brand/10 text-brand font-medium'
                        : 'text-text-muted hover:bg-surface-alt hover:text-text'
                    }`}
                  >
                    {t(item.labelKey as Parameters<typeof t>[0])}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
