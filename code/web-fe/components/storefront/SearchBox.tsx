'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { Product } from '@/lib/types';
import { productsApi } from '@/lib/api';

export default function SearchBox({
  variant = 'desktop',
  onNavigate,
}: {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Debounced product suggestions (search by name) as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const { data } = await productsApi.list({ search: q, limit: 6 });
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function goToResults() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    goToResults();
  }

  function pick(slug: string) {
    setOpen(false);
    setQuery('');
    onNavigate?.();
    router.push(`/products/${slug}`);
  }

  return (
    <div ref={ref} className={variant === 'desktop' ? 'relative w-full max-w-sm' : 'relative w-full'}>
      <form onSubmit={handleSubmit} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Search products…"
          aria-label="Search products"
          className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-full bg-surface-alt focus:bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
          >
            <X size={15} />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No products found.</p>
          ) : (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((p) => {
                const v0 = p.variants?.[0];
                const image = v0?.images?.[0];
                const price = v0 ? parseFloat(v0.price) : null;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pick(p.slug)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-alt transition-colors"
                    >
                      <span className="relative size-10 shrink-0 rounded-md overflow-hidden bg-surface-alt border border-border">
                        {image && <Image src={image} alt="" fill sizes="40px" className="object-cover" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-text truncate">{p.name}</span>
                        {price !== null && <span className="block font-mono text-xs text-text-muted">${price.toFixed(2)}</span>}
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
              onClick={goToResults}
              className="w-full border-t border-border px-4 py-2.5 text-left text-sm text-brand hover:bg-surface-alt transition-colors"
            >
              See all results for “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Storefront navigation product search box.
