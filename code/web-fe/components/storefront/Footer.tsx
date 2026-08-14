'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/storefront/LanguageSwitcher';

/* Brand glyphs — lucide dropped social brand icons, so inline them. */
function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.62c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36Zm5.48-2.9a1.24 1.24 0 1 1 0 2.48 1.24 1.24 0 0 1 0-2.48Z" />
    </svg>
  );
}
function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}
function YtIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products',     href: '/products' },
      { label: 'New Arrivals',     href: '/products?sort=newest' },
      { label: 'Best Sellers',     href: '/products?sort=best-sellers' },
      { label: 'Trending',         href: '/products?sort=trending' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact Us',          href: 'mailto:hello@declaystore.com' },
      { label: 'Shipping & Returns',  href: '/policies' },
      { label: 'Track Your Order',    href: '/orders' },
      { label: 'FAQ',                 href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Story', href: '#' },
      { label: 'Journal',   href: '/blog' },
      { label: 'Careers',   href: '/careers' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign In',   href: '/login' },
      { label: 'My Orders', href: '/orders' },
      { label: 'Wishlist',  href: '/wishlist' },
      { label: 'Profile',   href: '/account' },
    ],
  },
];

const SOCIAL = [
  { label: 'Instagram', href: '#', icon: IgIcon },
  { label: 'Facebook',  href: '#', icon: FbIcon },
  { label: 'YouTube',   href: '#', icon: YtIcon },
  { label: 'X',         href: '#', icon: XIcon },
];

export default function Footer() {
  const { t } = useT();
  return (
    <footer className="mt-auto border-t border-border bg-surface-alt">
      <div className="relative">
        <div className="absolute right-4 top-4 hidden md:block">
          <LanguageSwitcher />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-x-6 gap-y-10">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center" aria-label="Declay Store — home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/DeCLAYStudioLogo.avif" alt="Declay Studio" className="h-10 w-auto" />
            </Link>
            <p className="mt-4 text-sm text-text-muted max-w-xs leading-relaxed">
              Handcrafted figures, sculpted by hand and painted with care — made to be loved.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="size-9 flex items-center justify-center rounded-full border border-border text-text-muted hover:text-brand hover:border-brand transition-colors"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-sans text-sm font-semibold text-text mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-text-muted hover:text-text transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="font-sans text-xs text-text-faint">
            &copy; {new Date().getFullYear()} Declay Studio. {t('footer.rights')}
          </p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-xs text-text-muted">
            <span className="text-text-faint">Vietnam</span>
            <Link href="/terms" className="hover:text-text transition-colors">{t('footer.terms')}</Link>
            <Link href="/policies" className="hover:text-text transition-colors">{t('footer.privacy')}</Link>
            <Link href="#" className="hover:text-text transition-colors">Cookie Settings</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
