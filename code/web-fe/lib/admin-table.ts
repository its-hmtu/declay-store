/**
 * M-48: sorting, searching and date-range filtering for admin tables.
 *
 * Pure — no React — so the rules that decide what an admin sees can be tested
 * without mounting a table. Every admin list runs through here, which is what
 * keeps "sort by created date" meaning the same thing on nineteen screens.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  /** Column key, or null while the list is in its natural order. */
  key: string | null;
  direction: SortDirection;
}

export interface DateRange {
  /** ISO date (yyyy-mm-dd) from a native date input, or '' for open-ended. */
  from?: string;
  to?: string;
}

/**
 * Clicking a column cycles asc → desc → unsorted.
 *
 * The third state matters: without it there is no way back to the order the API
 * returned, which for most of these lists is the meaningful one (newest first,
 * queue position, sort_order).
 */
export function nextSort(current: SortState, key: string): SortState {
  if (current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return { key: null, direction: 'asc' };
}

function valueOf(row: object, key: string): unknown {
  // Supports "user.name" so a column can point at a nested field.
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, row);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]|$)/;

/** Dates arrive as ISO strings from the API; compare them as dates, not text. */
function normalise(value: unknown): string | number {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();

  const text = String(value);
  if (ISO_DATE.test(text)) {
    const ms = new Date(text).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  // Numeric strings ("1200.50" from DECIMAL columns) must not sort as text,
  // otherwise 9 lands after 1200.
  if (text !== '' && !Number.isNaN(Number(text))) return Number(text);
  return text.toLowerCase();
}

export function sortRows<T extends object>(rows: T[], sort: SortState): T[] {
  if (!sort.key) return rows;
  const key = sort.key;
  const factor = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = normalise(valueOf(a, key));
    const bv = normalise(valueOf(b, key));

    // Empty values sink to the bottom in BOTH directions — a row with no end
    // date is not "the earliest", it is unknown, and burying it keeps the top of
    // the table meaningful.
    const aEmpty = av === '';
    const bEmpty = bv === '';
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    if (aEmpty && bEmpty) return 0;

    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}

/** Case-insensitive substring match across the given fields. */
export function searchRows<T extends object>(
  rows: T[],
  query: string,
  fields: string[],
): T[] {
  const term = query.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) =>
    fields.some((field) => {
      const value = valueOf(row, field);
      return value != null && String(value).toLowerCase().includes(term);
    }),
  );
}

/**
 * Filter by a date range, inclusive on both ends.
 *
 * `to` is pushed to the end of that day: an admin who picks 6 Aug for both ends
 * means "things from the 6th", not "things created at exactly 00:00".
 */
export function filterByDate<T extends object>(
  rows: T[],
  field: string,
  range: DateRange,
): T[] {
  const from = range.from ? new Date(`${range.from}T00:00:00`).getTime() : null;
  const to = range.to ? new Date(`${range.to}T23:59:59.999`).getTime() : null;
  if (from == null && to == null) return rows;

  return rows.filter((row) => {
    const raw = valueOf(row, field);
    if (raw == null) return false; // no date cannot satisfy a date filter
    const ms = new Date(String(raw)).getTime();
    if (Number.isNaN(ms)) return false;
    if (from != null && ms < from) return false;
    if (to != null && ms > to) return false;
    return true;
  });
}

/** Everything a list page does to its rows, in the order that makes sense. */
export function applyTableState<T extends object>(
  rows: T[],
  options: {
    search?: string;
    searchFields?: string[];
    dateField?: string;
    dateRange?: DateRange;
    sort?: SortState;
  },
): T[] {
  let result = rows;
  if (options.search && options.searchFields?.length) {
    result = searchRows(result, options.search, options.searchFields);
  }
  if (options.dateField && options.dateRange) {
    result = filterByDate(result, options.dateField, options.dateRange);
  }
  if (options.sort) result = sortRows(result, options.sort);
  return result;
}

/** Compact, unambiguous date for a table cell. */
export function formatTableDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTableDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
