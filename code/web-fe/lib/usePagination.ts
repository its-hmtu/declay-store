import { useState } from 'react';

/**
 * Client-side pagination over an already-filtered array. The current page is
 * clamped to a valid range, so shrinking the input (e.g. after filtering) never
 * leaves you on an empty page. Reset to page 1 from the caller when filters change.
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const paged = items.slice((current - 1) * pageSize, current * pageSize);
  return { page: current, setPage, totalPages, total: items.length, paged, pageSize };
}
