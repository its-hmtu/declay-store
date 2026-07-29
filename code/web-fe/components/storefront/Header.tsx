'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, User, LogOut, Menu, X, ChevronDown, Heart, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';
import SearchBox from '@/components/storefront/SearchBox';
import type { Category, Collection } from '@/lib/types';
import { isEnabled } from '@/lib/features';
import { useT } from '@/lib/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/storefront/LanguageSwitcher';
import { useCart } from '@/lib/cart/CartProvider';

const NAV = [
  { href: '/products',    label: 'Shop', i18n: 'nav.shop' as const },
  { href: '/collections', label: 'Collections', feature: 'collections' as const },
  { href: '/blog',     label: 'Journal', feature: 'blog' as const },
  { href: '/careers',  label: 'Careers', feature: 'careers' as const },
];

export default function Header({ categories = [], collections = [] }: { categories?: Category[]; collections?: Collection[] }) {
  const { t } = useT();
  const pathname   = usePathname();
  const router     = useRouter();
  const [open, setOpen] = useState(false);       // mobile drawer
  const [shopOpen, setShopOpen] = useState(false); // desktop mega menu
  const isLoggedIn = auth.isLoggedIn();
  // M-20: badge đọc từ trạng thái giỏ hàng dùng chung. Trước đây nó tự gọi API
  // và chỉ nạp lại khi ĐỔI TRANG — thêm hàng xong đứng yên thì số không đổi.
  const { count: cartCount, refresh: refreshCart } = useCart();

  async function logout() {
    const token = auth.getToken();
    if (token) {
      try { await authApi.logout(token); } catch {}
    }
    auth.clearTokens();
    await refreshCart();
    router.push('/login');
  }

  // Editorial groupings for the mega menu. `sort` hints are forward-compatible
  // with a future backend ordering; today they resolve to the full catalogue.
  const limited = categories.find((c) => /limited/i.test(c.name));
  const featuredLinks = [
    { label: 'New Arrivals',     href: '/products?sort=newest' },
    { label: 'Best Sellers',     href: '/products?sort=best-sellers' },
    ...(limited ? [{ label: 'Limited Editions', href: `/products?categoryId=${limited.id}` }] : []),
    { label: 'Shop All',         href: '/products' },
  ];
  const bestSellerLinks = [
    { label: 'Top Rated',   href: '/products?sort=best-sellers' },
    { label: 'Most Gifted', href: '/products?sort=best-sellers' },
    { label: 'Staff Picks', href: '/products?sort=best-sellers' },
  ];
  const trendingLinks = [
    { label: 'This Week',       href: '/products?sort=trending' },
    { label: 'Fan Favorites',   href: '/products?sort=trending' },
    { label: 'New This Season', href: '/products?sort=newest' },
  ];

  const collectionLinks = isEnabled('collections') ? collections.map((c) => ({ label: c.name, href: `/products?collectionId=${c.id}` })) : [];
  const visibleNav = NAV.filter((n) => isEnabled(('feature' in n ? n.feature : undefined) as any));
  const popularTerms = [...categories.map((c) => c.name), ...collections.map((c) => c.name)].slice(0, 8);

  const closeShop = () => setShopOpen(false);

  return (
    <header
      className="sticky top-0 z-40 bg-surface/90 backdrop-blur"
      onMouseLeave={closeShop}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0" onMouseEnter={closeShop} aria-label="Declay Store — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/DeCLAYStudioLogo.avif" alt="Declay Studio" className="h-9 w-auto" />
        </Link>

        {/* Desktop nav (monospace) */}
        <nav className="hidden md:flex items-center gap-7 flex-1 justify-center">
          {visibleNav.map((n) => {
            const { href, label } = n;
            const active = pathname.startsWith(href);
            const isShop = href === '/products' && categories.length > 0;
            return (
              <Link
                key={href}
                href={href}
                onMouseEnter={() => (isShop ? setShopOpen(true) : closeShop())}
                className={`flex items-center gap-1 font-mono text-sm transition-colors ${
                  active || (isShop && shopOpen) ? 'text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                {'i18n' in n && n.i18n ? t(n.i18n) : label}
                {isShop && (
                  <ChevronDown size={13} className={`transition-transform ${shopOpen ? 'rotate-180' : ''}`} />
                )}
              </Link>
            );
          })}
        </nav>


        {/* Actions */}
        <div className="flex items-center gap-2" onMouseEnter={closeShop}>
          <div className="hidden md:block">
            <SearchBox variant="desktop" popularTerms={popularTerms} />
          </div>
          <div className="hidden md:block ml-1"><LanguageSwitcher /></div>
          {isEnabled('wishlist') && (
          <Link
            href="/wishlist"
            className="p-2 text-text-muted hover:text-text transition-colors"
            aria-label="Wishlist"
          >
            <Heart size={19} />
          </Link>
          )}
          <Link
            href="/cart"
            className="relative p-2 text-text-muted hover:text-text transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {isLoggedIn && <NotificationBell variant="customer" />}

          {isLoggedIn ? (
            <div className="relative group">
              <button className="p-2 text-text-muted hover:text-text transition-colors" aria-label="Account menu">
                <User size={19} />
              </button>
              {/* pt-2 keeps the hover bridge so the menu doesn't close in the gap */}
              <div className="absolute right-0 top-full pt-2 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150">
                <div className="w-48 rounded-xl border border-border bg-surface shadow-lg shadow-black/5 p-1.5">
                  <Link href="/account" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-alt transition-colors">
                    <User size={15} /> {t('nav.profile')}
                  </Link>
                  <Link href="/orders" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-alt transition-colors">
                    <Package size={15} /> {t('nav.orders')}
                  </Link>
                  <div className="my-1 h-px bg-border" />
                  <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/10 transition-colors">
                    <LogOut size={15} /> {t('nav.logout')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/login" className="hidden sm:inline-flex font-mono text-sm text-text-muted hover:text-text transition-colors ml-1">
              {t('nav.signIn')}&nbsp;&rarr;
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-text"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Desktop mega menu — full width, Nike style */}
      <div
        className={`hidden md:block absolute inset-x-0 top-full border-t border-border bg-surface shadow-xl shadow-black/5 transition-all duration-200 ${
          shopOpen ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-1'
        }`}
        onMouseEnter={() => setShopOpen(true)}
      >
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-5 gap-4">
          <MegaColumn title="Featured" links={featuredLinks} onNavigate={closeShop} accent />
          <MegaColumn title="Best Sellers" links={bestSellerLinks} onNavigate={closeShop} />
          <MegaColumn title="Trending" links={trendingLinks} onNavigate={closeShop} />

          {/* By Category — the real catalogue */}
          <div className="col-span-1">
            <p className="eyebrow mb-4">By Category</p>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/products?categoryId=${cat.id}`}
                    onClick={closeShop}
                    className="text-sm text-text-muted hover:text-text transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* By Collection */}
          {collectionLinks.length > 0 && (
            <div className="col-span-1">
              <p className="eyebrow mb-4">By Collection</p>
              <ul className="space-y-2.5">
                {collectionLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={closeShop}
                      className="text-sm text-text-muted hover:text-text transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-4 flex flex-col gap-4">
          <SearchBox variant="mobile" onNavigate={() => setOpen(false)} />
          {visibleNav.map((n) => {
            const { href, label } = n;
            return (
            <div key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="font-mono text-text-muted hover:text-text py-1 block"
              >
                {'i18n' in n && n.i18n ? t(n.i18n) : label}
              </Link>
              {href === '/products' && categories.length > 0 && (
                <div className="mt-2 ml-3 flex flex-col gap-1.5 border-l border-border pl-3">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products?categoryId=${cat.id}`}
                      onClick={() => setOpen(false)}
                      className="text-sm text-text-muted hover:text-text py-0.5"
                    >
                      {cat.name}
                    </Link>
                  ))}
                  {collectionLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="text-sm text-text-muted hover:text-text py-0.5"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            );
          })}

          {/* Account section */}
          <div className="mt-2 pt-4 border-t border-border flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 font-mono text-text-muted hover:text-text py-1">
                  <User size={16} /> {t('nav.profile')}
                </Link>
                <Link href="/orders" onClick={() => setOpen(false)} className="flex items-center gap-2.5 font-mono text-text-muted hover:text-text py-1">
                  <Package size={16} /> {t('nav.orders')}
                </Link>
                <button onClick={() => { setOpen(false); logout(); }} className="flex items-center gap-2.5 font-mono text-error py-1 text-left">
                  <LogOut size={16} /> {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="font-mono text-text-muted hover:text-text py-1">
                {t('nav.signIn')} &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MegaColumn({
  title, links, onNavigate, accent = false,
}: {
  title: string;
  links: { label: string; href: string }[];
  onNavigate: () => void;
  accent?: boolean;
}) {
  return (
    <div className="col-span-1">
      <p className="eyebrow mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className={`text-sm transition-colors ${
                accent ? 'text-text font-medium hover:text-brand' : 'text-text-muted hover:text-text'
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
