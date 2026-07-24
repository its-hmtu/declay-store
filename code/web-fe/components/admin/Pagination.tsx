'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Builds a compact page window like [1, '…', 4, 5, 6, '…', 12]. */
function windowed(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

interface Props {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, onChange }: Props) {
  if (totalPages <= 1) return null;
  const btn = 'min-w-9 h-9 px-2 flex items-center justify-center rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      {total !== undefined && (
        <p className="text-xs text-text-muted">{total} item{total !== 1 ? 's' : ''}</p>
      )}
      <div className="flex items-center gap-1.5 sm:ml-auto">
        <button className={`${btn} border-border text-text-muted hover:border-brand`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        {windowed(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-text-faint">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`${btn} ${p === page ? 'bg-brand text-white border-brand' : 'border-border text-text-muted hover:border-brand hover:text-brand'}`}
            >
              {p}
            </button>
          ),
        )}
        <button className={`${btn} border-border text-text-muted hover:border-brand`} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
