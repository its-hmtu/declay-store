import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Hand, Sparkles, Truck } from 'lucide-react';
import { productsApi, articlesApi } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';
import BannerCarousel from '@/components/storefront/BannerCarousel';

export const metadata: Metadata = {
  title: 'Declay Store',
  description: 'Discover unique, handcrafted figures made with love.',
};

const PROCESS = [
  { n: '001', title: 'Sculpted',  desc: 'Every figure begins as raw clay, shaped by hand in our studio.' },
  { n: '002', title: 'Cast',      desc: 'Master pieces are cast in small, limited batches — never mass produced.' },
  { n: '003', title: 'Painted',   desc: 'Each piece is hand-painted, so no two are ever exactly alike.' },
  { n: '004', title: 'Shipped',   desc: 'Padded, insured, and sent to a home where it belongs.' },
];

const VALUES = [
  { icon: Hand,     title: 'Made by hand',  desc: 'Real craft, not a factory line. Every piece carries the maker’s touch.' },
  { icon: Sparkles, title: 'One of a kind', desc: 'Small batches and hand-painting mean your figure is genuinely yours.' },
  { icon: Truck,    title: 'Shipped with care', desc: 'Carefully packed and insured, so it arrives exactly as intended.' },
];

export default async function HomePage() {
  const [productsRes, articlesRes] = await Promise.allSettled([
    productsApi.list({ limit: 8 }),
    articlesApi.list({ limit: 3 }),
  ]);

  const products = productsRes.status === 'fulfilled' ? productsRes.value.data : [];
  const articles = articlesRes.status === 'fulfilled' ? articlesRes.value.data : [];
  const featured = products.slice(0, 3);

  return (
    <>
      {/* ── Promotional banners (admin-managed) ──────────── */}
      <BannerCarousel />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-sky-gradient">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/products" className="btn-ink">Shop the collection</Link>
            <Link href="/blog" className="btn-line">Read the journal</Link>
          </div>

          {/* Showcase card */}
          {featured.length > 0 && (
            <div className="card-soft mt-14 text-left p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="font-sans font-semibold text-text">Fresh from the studio</p>
                <span className="font-mono text-xs px-2 py-0.5 bg-highlight text-olive">New</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {featured.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Featured products ────────────────────────────── */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-display text-text">Latest creations</h2>
            <Link href="/products" className="font-mono text-sm text-text-muted hover:text-text">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Numbered process list ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-accent-soft relative">
          <Image
            src="/studio-photo.jpg"
            alt="Declay studio photo"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 40vw, 100vw"
            priority={false}
          />
          <div className="absolute inset-0s opacity-100" />
        </div>
        <div>
          <p className="eyebrow mb-3">How it’s made</p>
          <h2 className="text-3xl md:text-4xl font-display text-text mb-8">
            Everything that goes into a Declay figure
          </h2>
          <ul>
            {PROCESS.map(({ n, title, desc }) => (
              <li key={n} className="flex gap-5 py-5 border-t border-border last:border-b">
                <span className="font-mono text-xs text-text-faint pt-1 shrink-0">{n}</span>
                <div>
                  <p className="font-sans font-semibold text-text">{title}</p>
                  <p className="font-serif text-sm text-text-muted mt-1">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/products" className="btn-ink mt-8">Shop the collection</Link>
        </div>
      </section>

      {/* ── Values on cream ──────────────────────────────── */}
      <section className="bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-center text-3xl md:text-5xl leading-tight mb-12">
            <span className="font-display italic font-light">Made by hand.</span>{' '}
            <span className="font-sans font-extrabold">Built to delight.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-soft p-7">
                <Icon className="text-accent mb-5" size={26} strokeWidth={1.5} />
                <p className="font-sans font-semibold text-text mb-2">{title}</p>
                <p className="font-serif text-sm text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journal preview ──────────────────────────────── */}
      {articles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-display text-text">From the journal</h2>
            <Link href="/blog" className="font-mono text-sm text-text-muted hover:text-text">
              View all articles &rarr;
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-7">
            {articles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="group block">
                <div className="aspect-video rounded-xl bg-surface-alt border border-border overflow-hidden mb-3" />
                <p className="eyebrow mb-1.5">
                  {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <h3 className="font-sans font-semibold text-text group-hover:underline decoration-1 underline-offset-2 line-clamp-2">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="mt-1.5 font-serif text-sm text-text-muted line-clamp-2">{article.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA band ─────────────────────────────────────── */}
      <section className="bg-surface-alt">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-display text-text">
            Ready to find your figure?
          </h2>
          <div className="mt-7 flex justify-center">
            <Link href="/products" className="btn-ink">Browse the collection</Link>
          </div>
        </div>
      </section>
    </>
  );
}
