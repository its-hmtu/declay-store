import type { Metadata } from 'next';
import Link from 'next/link';
import { productsApi, articlesApi } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';

export const metadata: Metadata = {
  title: 'Handcrafted Figures — Declay Store',
  description: 'Discover unique, handcrafted figures made with love.',
};

export default async function HomePage() {
  const [productsRes, articlesRes] = await Promise.allSettled([
    productsApi.list({ limit: 8 }),
    articlesApi.list({ limit: 3 }),
  ]);

  const products = productsRes.status === 'fulfilled' ? productsRes.value.data : [];
  const articles = articlesRes.status === 'fulfilled' ? articlesRes.value.data : [];

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-faint border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-36 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-medium text-brand-light uppercase tracking-widest mb-4">
              Handcrafted with love
            </p>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-text leading-tight">
              Figures that tell a story
            </h1>
            <p className="mt-6 text-lg text-text-muted leading-relaxed max-w-md">
              Each piece is sculpted by hand, painted with care, and shipped to a home where it belongs.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/products"
                className="inline-flex items-center px-7 py-3.5 bg-brand text-white font-medium rounded-lg hover:bg-brand-light transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center px-7 py-3.5 border border-brand text-brand font-medium rounded-lg hover:bg-brand-faint transition-colors"
              >
                Our Journal
              </Link>
            </div>
          </div>
          <div className="hidden md:block aspect-square max-w-sm mx-auto rounded-2xl bg-surface-alt border border-border overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-text-faint text-sm">
              Featured image
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-serif text-3xl font-semibold text-text">Latest Creations</h2>
            <Link href="/products" className="text-sm text-brand hover:underline font-medium">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Values strip */}
      <section className="bg-surface-alt border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: '🤲', title: 'Handcrafted',   sub: 'Every piece made by hand' },
            { icon: '🎨', title: 'One of a Kind', sub: 'No two figures alike' },
            { icon: '📦', title: 'Safe Shipping', sub: 'Padded & insured' },
            { icon: '💳', title: 'Secure Payment', sub: 'Via Stripe' },
          ].map(({ icon, title, sub }) => (
            <div key={title}>
              <p className="text-3xl mb-2">{icon}</p>
              <p className="font-serif font-semibold text-text">{title}</p>
              <p className="text-sm text-text-muted mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journal preview */}
      {articles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-serif text-3xl font-semibold text-text">From the Journal</h2>
            <Link href="/blog" className="text-sm text-brand hover:underline font-medium">
              All posts &rarr;
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group block p-6 rounded-xl border border-border bg-surface hover:border-brand-lighter transition-colors"
              >
                {article.coverImage && (
                  <div className="aspect-video bg-surface-alt rounded-lg overflow-hidden mb-4">
                    {/* Cover image */}
                  </div>
                )}
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
                  {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <h3 className="font-serif font-semibold text-text group-hover:text-brand transition-colors line-clamp-2">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="mt-2 text-sm text-text-muted line-clamp-3">{article.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
