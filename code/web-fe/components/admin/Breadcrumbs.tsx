'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', products: 'Products', categories: 'Categories',
  orders: 'Orders', articles: 'Articles', jobs: 'Jobs', discounts: 'Discounts',
  banners: 'Banners', reviews: 'Reviews', users: 'Admin Users', settings: 'Settings',
  new: 'New',
};

/** Auto-generated breadcrumb trail from the current /admin/... path. */
export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return null;

  const crumbs: { href: string; label: string }[] = [{ href: '/admin/dashboard', label: 'Dashboard' }];
  let acc = '/admin';
  for (const seg of parts.slice(1)) {
    acc += `/${seg}`;
    if (seg === 'dashboard') continue;
    const label = LABELS[seg] ?? (/^\d+$/.test(seg) ? `#${seg}` : seg);
    crumbs.push({ href: acc, label });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs text-text-muted mb-5">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} className="text-text-faint" />}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} className="hover:text-text transition-colors">{c.label}</Link>
          ) : (
            <span className="text-text font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
