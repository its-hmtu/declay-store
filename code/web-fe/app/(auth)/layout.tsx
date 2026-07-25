import type { Metadata } from 'next';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: { default: 'Declay Store', template: '%s | Declay' },
  description: 'Handcrafted figures made with love.',
};

// Auth layout — intentionally has no storefront Header/Footer/ChatWidget.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getServerLocale();

  return (
    <LocaleProvider initialLocale={locale}>
    <div className="min-h-full flex flex-col">
      <header className="p-5 sm:p-6">
        <Link href="/" aria-label="Declay Store — home" className="inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/DeCLAYStudioLogo.avif" alt="Declay Studio" className="h-9 w-auto" />
        </Link>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <Toaster richColors position="bottom-right" />
    </div>
    </LocaleProvider>
  );
}
