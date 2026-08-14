'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Tag, ShoppingBag,
  FileText, Briefcase, LogOut,
  Ticket, Image as ImageIcon, Star, Users, Settings, ScrollText, Truck,
  Megaphone, LayoutGrid, BarChart3, Banknote, MessagesSquare,
} from 'lucide-react';
import { adminAuth } from '@/lib/auth';
import { isEnabled, type FeatureKey } from '@/lib/features';
import { toast } from 'sonner';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; feature?: FeatureKey };
type NavGroup = { title?: string; items: NavItem[] };

/**
 * M-48: grouped navigation.
 *
 * The flat 19-item list gave equal weight to "Dashboard" and "Tags", so finding
 * anything meant scanning the whole column. Groups follow the shape of the work —
 * what you sell, what you ship, how you promote it — rather than alphabetical or
 * historical order.
 *
 * Tags is deliberately absent: the module still exists and `slugify` from it is
 * used by collections, but nothing in the storefront surfaces tags, so an admin
 * screen for them is a dead end.
 */
const NAV: NavGroup[] = [
  { items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Reports and Analytics',
    items: [
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/cod', label: 'COD reconciliation', icon: Banknote },
    ],
  },
  {
    title: 'Manage products',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/categories', label: 'Categories', icon: Tag },
      { href: '/admin/collections', label: 'Collections', icon: LayoutGrid, feature: 'collections' },
    ],
  },
  {
    title: 'Manage orders',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/admin/shipping-methods', label: 'Shipping', icon: Truck },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, feature: 'campaigns' },
      { href: '/admin/discounts', label: 'Discount Codes', icon: Ticket },
      { href: '/admin/banners', label: 'Banners', icon: ImageIcon, feature: 'banners' },
    ],
  },
  {
    title: 'Customer care',
    items: [
      { href: '/admin/inbox', label: 'Inbox', icon: MessagesSquare, feature: 'chat' },
      { href: '/admin/reviews', label: 'Reviews', icon: Star },
    ],
  },
  { items: [{ href: '/admin/articles', label: 'Articles', icon: FileText, feature: 'articles' }] },
  { items: [{ href: '/admin/jobs', label: 'Careers', icon: Briefcase, feature: 'jobs' }] },
  {
    title: 'Manage Accounts',
    items: [{ href: '/admin/users', label: 'Admin Users', icon: Users }],
  },
  {
    title: 'Site Configurations',
    items: [
      { href: '/admin/pages', label: 'Site pages', icon: ScrollText },
      { href: '/admin/settings', label: 'Site Settings', icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    adminAuth.clearToken();
    toast.success('Logged out.');
    router.push('/admin/login');
  }

  const groups = NAV
    .map((group) => ({ ...group, items: group.items.filter((i) => isEnabled(i.feature)) }))
    .filter((group) => group.items.length > 0);

  return (
    /**
     * `fixed` + `h-screen`: the sidebar used to scroll away with the page, leaving
     * a band of empty colour beside long tables. It now stays put and scrolls its
     * own nav independently; the main area offsets by this width.
     */
    <aside className="fixed inset-y-0 left-0 z-30 flex h-screen w-56 shrink-0 flex-col bg-brand text-white">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/DeCLAYStudioLogo.avif" alt="Declay" className="h-8 w-auto rounded-md bg-white p-1" />
        <p className="font-serif text-lg font-semibold">Admin</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group, gi) => (
          <div key={group.title ?? `group-${gi}`} className="px-3 py-1.5">
            {group.title && (
              <p className="px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}
