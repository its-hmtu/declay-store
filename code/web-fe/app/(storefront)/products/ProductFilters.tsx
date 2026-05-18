'use client';

import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/types';

export default function ProductFilters({
  categories,
  selected,
  search,
}: {
  categories: Category[];
  selected?: number;
  search?: string;
}) {
  const router = useRouter();

  function navigate(categoryId?: number, q?: string) {
    const params = new URLSearchParams();
    if (categoryId) params.set('categoryId', String(categoryId));
    if (q)         params.set('search',     q);
    router.push(`/products?${params}`);
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Search</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
          navigate(selected, q);
        }}>
          <input
            name="q"
            defaultValue={search}
            placeholder="Search products…"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand placeholder:text-text-faint"
          />
        </form>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Category</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => navigate(undefined, search)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                  !selected ? 'text-brand font-medium bg-brand-faint' : 'text-text-muted hover:text-text'
                }`}
              >
                All
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => navigate(cat.id, search)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    selected === cat.id ? 'text-brand font-medium bg-brand-faint' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
