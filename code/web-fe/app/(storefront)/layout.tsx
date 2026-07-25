import type { Metadata } from 'next';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ChatWidget from '@/components/storefront/ChatWidget';
import { Toaster } from 'sonner';
import { categoriesApi, collectionsApi } from '@/lib/api';
import { isEnabled } from '@/lib/features';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: { default: 'Declay Store', template: '%s | Declay' },
  description: 'Handcrafted figures made with love.',
};

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [categoriesRes, collectionsRes] = await Promise.all([
    categoriesApi.list().catch(() => null),
    collectionsApi.list().catch(() => null),
  ]);
  const { locale } = await getServerLocale();
  const categories = categoriesRes?.data ?? [];
  const collections = collectionsRes?.data ?? [];

  return (
    <LocaleProvider initialLocale={locale}>
      <Header categories={categories} collections={collections} />
      <main className="flex-1">{children}</main>
      <Footer />
      {isEnabled('chat') && <ChatWidget />}
      <Toaster richColors position="bottom-right" />
    </LocaleProvider>
  );
}
