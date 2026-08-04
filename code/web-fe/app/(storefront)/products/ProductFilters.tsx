'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { Category, Collection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';

const PRICE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  // M-15: khoảng giá theo VND cho thị trường trong nước.
  { label: 'Dưới 500.000 ₫', max: 500_000 },
  { label: '500.000 – 1.000.000 ₫', min: 500_000, max: 1_000_000 },
  { label: '1.000.000 – 2.000.000 ₫', min: 1_000_000, max: 2_000_000 },
  { label: '2.000.000 – 5.000.000 ₫', min: 2_000_000, max: 5_000_000 },
  { label: 'Trên 5.000.000 ₫', min: 5_000_000 },
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
  const { t } = useT();
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
    cn('w-full text-left text-sm px-0 py-1.5 transition-colors',
      active ? 'text-text font-semibold underline underline-offset-2' : 'text-text-muted hover:text-text');

  return (
    <div>
      {/* Search */}
      <div className="pb-4 border-b border-border">
        <p className="text-sm font-semibold text-text mb-3">{t('shop.filterSearch')}</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
          setParams({ search: q || undefined });
        }}>
          <input
            name="q"
            defaultValue={search}
            placeholder={t('common.search')}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand placeholder:text-text-faint"
          />
        </form>
      </div>

      {categories.length > 0 && (
        <Section title={t('shop.filterCategory')}>
          <button onClick={() => setParams({ categoryId: undefined })} className={rowCls(!selected)}>{t('shop.all')}</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setParams({ categoryId: String(cat.id) })} className={rowCls(selected === cat.id)}>
              {cat.name}
            </button>
          ))}
        </Section>
      )}

      {collections.length > 0 && (
        <Section title={t('shop.filterCollection')}>
          <button onClick={() => setParams({ collectionId: undefined })} className={rowCls(!selectedCollection)}>{t('shop.all')}</button>
          {collections.map((col) => (
            <button key={col.id} onClick={() => setParams({ collectionId: String(col.id) })} className={rowCls(selectedCollection === col.id)}>
              {col.name}
            </button>
          ))}
        </Section>
      )}

      <Section title={t('shop.filterPrice')}>
        <button onClick={() => setParams({ minPrice: undefined, maxPrice: undefined })} className={rowCls(noPrice)}>{t('shop.allPrices')}</button>
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
