'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { auth } from '@/lib/auth';
import { authApi } from '@/lib/api';

const NAV = [
  { href: '/products', label: 'Shop' },
  { href: '/blog',     label: 'Journal' },
  { href: '/careers',  label: 'Careers' },
];

export default function Header({ cartCount = 0 }: { cartCount?: number }) {
  const pathname   = usePathname();
  const router     = useRouter();
  const [open, setOpen] = useState(false);
  const isLoggedIn = auth.isLoggedIn();

  async function logout() {
    const token = auth.getToken();
    if (token) {
      try { await authApi.logout(token); } catch {}
    }
    auth.clearTokens();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="font-serif text-xl font-semibold text-brand tracking-tight">
          Declay
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'text-brand'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative p-2 text-text-muted hover:text-brand transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center bg-brand text-white text-[10px] font-bold rounded-full">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          <Link
            href={isLoggedIn ? '/orders' : '/login'}
            className="p-2 text-text-muted hover:text-brand transition-colors"
            aria-label="Account"
          >
            <User size={20} />
          </Link>

          {isLoggedIn && (
            <button
              onClick={logout}
              className="p-2 text-text-muted hover:text-brand transition-colors"
              aria-label="Log out"
            >
              <LogOut size={20} />
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-brand"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-4 flex flex-col gap-4">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-brand font-medium py-1"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
