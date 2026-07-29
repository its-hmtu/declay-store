import type { Metadata } from 'next';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ChatWidget from '@/components/storefront/ChatWidget';
import { Toaster } from 'sonner';
import { categoriesApi, collectionsApi } from '@/lib/api';
import { isEnabled } from '@/lib/features';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { CartProvider } from '@/lib/cart/CartProvider';
import CartDrawer from '@/components/storefront/CartDrawer';
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
      {/* M-20: một nguồn sự thật cho giỏ hàng — badge, ngăn kéo và trang giỏ
          hàng cùng đọc từ đây nên không bao giờ lệch nhau. */}
      <CartProvider>
        <Header categories={categories} collections={collections} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        {isEnabled('chat') && <ChatWidget />}
        <Toaster richColors position="bottom-right" />
      </CartProvider>
    </LocaleProvider>
  );
}
