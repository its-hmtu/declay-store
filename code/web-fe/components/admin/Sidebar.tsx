'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Tag, ShoppingBag,
  FileText, Briefcase, LogOut, ChevronRight,
} from 'lucide-react';
import { adminAuth } from '@/lib/auth';
import { toast } from 'sonner';

const NAV = [
  { href: '/admin/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/products',    label: 'Products',    icon: Package         },
  { href: '/admin/categories',  label: 'Categories',  icon: Tag             },
  { href: '/admin/orders',      label: 'Orders',      icon: ShoppingBag     },
  { href: '/admin/articles',    label: 'Articles',    icon: FileText        },
  { href: '/admin/jobs',        label: 'Jobs',        icon: Briefcase       },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  function logout() {
    adminAuth.clearToken();
    toast.success('Logged out.');
    router.push('/admin/login');
  }

  return (
    <aside className="w-56 shrink-0 bg-brand text-white flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-serif text-lg font-semibold">Declay Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}
