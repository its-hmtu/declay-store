'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { Product } from '@/lib/types';
import { productsApi } from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';

export default function SearchBox({
  variant = 'desktop',
  onNavigate,
  popularTerms = [],
}: {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
  popularTerms?: string[];
}) {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive]   = useState(false); // visible / highlighted (drives the enter transition)
  const [mounted, setMounted] = useState(false); // present in the DOM (kept true a beat longer for the exit transition)
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Lock page scroll behind the mask while the overlay is up — the darkened
  // background shouldn't scroll while the search panel floats on top of it.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // Debounced product suggestions (search by name) as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const { data } = await productsApi.list({ search: q, limit: 8 });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  // Esc closes the overlay.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);

  function open() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setMounted(true);
    // Mount in the closed visual state first, then flip to active on the next
    // frame so the opacity/scale/translate transition actually has something
    // to animate from (setting both at once would skip straight to "open").
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setActive(true));
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function close() {
    setActive(false); // plays the fade/slide-out transition
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setQuery('');
      setResults([]);
    }, 200); // matches the duration-200 transition below
  }

  function goToResults(term?: string) {
    const q = (term ?? query).trim();
    if (!q) return;
    close();
    onNavigate?.();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  }

  function pick(slug: string) {
    close();
    onNavigate?.();
    router.push(`/products/${slug}`);
  }

  const showResults = query.trim().length >= 2;

  const resultsList = (
    <>
      {loading && results.length === 0 ? (
        <p className="px-1 py-3 text-sm text-text-muted">Searching…</p>
      ) : results.length === 0 ? (
        <p className="px-1 py-3 text-sm text-text-muted">No products found.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {results.map((p) => {
            const v0 = p.variants?.[0];
            const image = v0?.images?.[0];
            const base = v0 ? parseFloat(v0.price) : null;
            const special = v0?.specialPrice ? parseFloat(v0.specialPrice) : null;
            const onSale = base !== null && special !== null && special >= 0 && special < base;
            const price = onSale ? special : base;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p.slug)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-surface-alt transition-colors"
                >
                  <span className="relative size-11 shrink-0 rounded-md overflow-hidden bg-surface-alt border border-border">
                    {image && <Image src={image} alt="" fill sizes="44px" className="object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text truncate">{p.name}</span>
                    {price !== null && (
                      <span className="block font-mono text-xs text-text-muted">
                        {onSale ? (<><span className="text-error">{formatPrice(price)}</span> <span className="line-through">{formatPrice((base as number))}</span></>) : `${formatPrice(price)}`}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.trim() && (
        <button
          type="button"
          onClick={() => goToResults()}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
        >
          <Search size={14} /> See all results for “{query.trim()}”
        </button>
      )}
    </>
  );

  // ── Mobile: simple inline field inside the drawer ──────────
  if (variant === 'mobile') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); goToResults(); }} className="flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 h-11">
        <Search size={18} className="text-text-faint shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="flex-1 min-w-0 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
      </form>
    );
  }

  // ── Desktop: Nike-style trigger pill + full-width overlay ──
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search"
        className="inline-flex items-center gap-2 h-9 w-44 lg:w-64 xl:w-72 pl-3 pr-4 rounded-full bg-surface-alt text-text-muted hover:bg-border/60 transition-colors"
      >
        <Search size={18} className="shrink-0" />
        <span className="text-sm truncate">Search</span>
      </button>

      {mounted && (
        <>
          {/* Mask — dims (and slightly blurs) the page behind the search overlay, fades with `active` */}
          <div
            className={cn(
              'fixed inset-0 top-0 left-0 right-0 bottom-0 h-screen z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out',
              active ? 'opacity-100' : 'opacity-0',
            )}
            onClick={close}
            aria-hidden
          />

          {/* Full-width search bar + panel — slides down and fades with `active` */}
          <div
            className={cn(
              'fixed top-0 inset-x-0 z-[60] bg-surface border-b border-border shadow-lg transition-all duration-200 ease-out',
              active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3',
            )}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
              <Link href="/" onClick={close} className="shrink-0" aria-label="Declay Store — home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/DeCLAYStudioLogo.avif" alt="Declay" className="h-8 w-auto" />
              </Link>

              {/* Highlighted search field — accent ring calls it out as the focal control */}
              <form
                onSubmit={(e) => { e.preventDefault(); goToResults(); }}
                className={cn(
                  'flex-1 flex items-center gap-2.5 rounded-full bg-surface-alt px-4 h-11 ring-2 transition-all duration-200 ease-out delay-75',
                  'focus-within:ring-accent focus-within:bg-surface',
                  active ? 'ring-accent/50 scale-100 opacity-100' : 'ring-transparent scale-[0.98] opacity-0',
                )}
              >
                <Search size={18} className="text-text-faint shrink-0" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="flex-1 min-w-0 bg-transparent text-base text-text placeholder:text-text-faint focus:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} aria-label="Clear search" className="text-text-faint hover:text-text">
                    <X size={16} />
                  </button>
                )}
              </form>

              <button type="button" onClick={close} className="shrink-0 text-sm font-medium text-text-muted hover:text-text px-1">
                Cancel
              </button>
            </div>

            {/* Panel */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 max-h-[70vh] overflow-auto">
              {showResults ? (
                resultsList
              ) : popularTerms.length > 0 ? (
                <div className="pt-1">
                  <p className="eyebrow mb-3">Popular Search Terms</p>
                  <div className="flex flex-wrap gap-2">
                    {popularTerms.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => goToResults(t)}
                        className="px-4 py-2 rounded-full border border-border text-sm text-text-muted hover:border-brand hover:text-brand transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  );
}
