'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PRODUCT_SORTS } from '@/lib/types';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const SORT_KEYS: Record<string, 'sort.newest' | 'sort.bestSellers' | 'sort.topRated' | 'sort.trending' | 'sort.priceAsc' | 'sort.priceDesc'> = {
  newest: 'sort.newest', 'best-sellers': 'sort.bestSellers', 'top-rated': 'sort.topRated',
  trending: 'sort.trending', 'price-asc': 'sort.priceAsc', 'price-desc': 'sort.priceDesc',
};

export default function ProductSort({
  value,
  basePath = '/products',
}: {
  value?: string;
  /** M-45: keeps sorting inside a collection page instead of bouncing to /products. */
  basePath?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();

  function change(sort: string) {
    const next = new URLSearchParams(params.toString());
    if (sort && sort !== 'newest') next.set('sort', sort);
    else next.delete('sort');
    next.delete('page'); // a new ordering resets pagination
    router.push(`${basePath}?${next}`);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-muted hidden sm:inline">{t('shop.sortBy')}</span>
      <Select value={value ?? 'newest'} onValueChange={change}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder={t('shop.sortBy')} />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{t(SORT_KEYS[s.value] ?? 'shop.sortBy')}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
