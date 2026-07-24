'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PRODUCT_SORTS } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function ProductSort({ value }: { value?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function change(sort: string) {
    const next = new URLSearchParams(params.toString());
    if (sort && sort !== 'newest') next.set('sort', sort);
    else next.delete('sort');
    next.delete('page'); // a new ordering resets pagination
    router.push(`/products?${next}`);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-muted hidden sm:inline">Sort by</span>
      <Select value={value ?? 'newest'} onValueChange={change}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
