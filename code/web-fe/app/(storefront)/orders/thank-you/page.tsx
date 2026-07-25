import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Order placed' };

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { t } = await getServerLocale();
  const sp = await searchParams;
  const orderId = sp.id;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
      <CheckCircle size={44} className="mx-auto text-success" />
      <h1 className="font-serif text-3xl font-bold text-text mt-4">{t('thankYou.title')}</h1>
      {orderId && <p className="mt-2 font-mono text-sm text-text-muted">{t('thankYou.order')} #{orderId}</p>}
      <p className="mt-4 text-text-muted">{t('thankYou.body')}</p>
      <Link
        href="/products"
        className="inline-flex items-center mt-8 px-7 py-3 bg-brand text-white rounded-lg hover:bg-brand-light transition-colors font-medium"
      >
        {t('cart.continueShopping')}
      </Link>
    </div>
  );
}
