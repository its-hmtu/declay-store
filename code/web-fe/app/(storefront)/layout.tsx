import type { Metadata } from 'next';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: { default: 'Declay Store', template: '%s | Declay' },
  description: 'Handcrafted figures made with love.',
};

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster richColors position="bottom-right" />
    </>
  );
}
