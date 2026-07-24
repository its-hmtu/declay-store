'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { Category, Collection } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRICE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under $25', max: 25 },
  { label: '$25 – $50', min: 25, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100 – $200', min: 100, max: 200 },
  { label: 'Over $200', min: 200 },
];

export default function ProductFilters({
  categories,
  collections = [],
  selected,
  selectedCollection,
  search,
}: {
  categories: Category[];
  collections?: Collection[];
  selected?: number;
  selectedCollection?: number;
  search?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    router.push(`/products?${next}`);
  }

  const curMin = sp.get('minPrice') ?? '';
  const curMax = sp.get('maxPrice') ?? '';
  const priceActive = (b: { min?: number; max?: number }) =>
    curMin === (b.min != null ? String(b.min) : '') && curMax === (b.max != null ? String(b.max) : '');
  const noPrice = !curMin && !curMax;

  const rowCls = (active: boolean) =>
    cn('w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors',
      active ? 'text-brand font-medium bg-brand-faint' : 'text-text-muted hover:text-text');

  return (
    <div>
      {/* Search */}
      <div className="pb-4 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Search</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
          setParams({ search: q || undefined });
        }}>
          <input
            name="q"
            defaultValue={search}
            placeholder="Search products…"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand placeholder:text-text-faint"
          />
        </form>
      </div>

      {categories.length > 0 && (
        <Section title="Category">
          <button onClick={() => setParams({ categoryId: undefined })} className={rowCls(!selected)}>All</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setParams({ categoryId: String(cat.id) })} className={rowCls(selected === cat.id)}>
              {cat.name}
            </button>
          ))}
        </Section>
      )}

      {collections.length > 0 && (
        <Section title="Collection">
          <button onClick={() => setParams({ collectionId: undefined })} className={rowCls(!selectedCollection)}>All</button>
          {collections.map((col) => (
            <button key={col.id} onClick={() => setParams({ collectionId: String(col.id) })} className={rowCls(selectedCollection === col.id)}>
              {col.name}
            </button>
          ))}
        </Section>
      )}

      <Section title="Shop By Price">
        <button onClick={() => setParams({ minPrice: undefined, maxPrice: undefined })} className={rowCls(noPrice)}>All prices</button>
        {PRICE_BUCKETS.map((b) => (
          <button
            key={b.label}
            onClick={() => setParams({ minPrice: b.min != null ? String(b.min) : undefined, maxPrice: b.max != null ? String(b.max) : undefined })}
            className={rowCls(priceActive(b))}
          >
            {b.label}
          </button>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-4 border-b border-border last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-semibold text-text">{title}</span>
        <ChevronDown size={16} className={cn('text-text-muted transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-3 flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}
