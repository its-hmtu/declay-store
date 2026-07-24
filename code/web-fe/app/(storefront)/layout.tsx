import type { Metadata } from 'next';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ChatWidget from '@/components/storefront/ChatWidget';
import { Toaster } from 'sonner';
import { categoriesApi, collectionsApi } from '@/lib/api';

export const metadata: Metadata = {
  title: { default: 'Declay Store', template: '%s | Declay' },
  description: 'Handcrafted figures made with love.',
};

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [categoriesRes, collectionsRes] = await Promise.all([
    categoriesApi.list().catch(() => null),
    collectionsApi.list().catch(() => null),
  ]);
  const categories = categoriesRes?.data ?? [];
  const collections = collectionsRes?.data ?? [];

  return (
    <>
      <Header categories={categories} collections={collections} />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
      <Toaster richColors position="bottom-right" />
    </>
  );
}
