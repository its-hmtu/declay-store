/**
 * Admin table rules live in the frontend (`web-fe/lib/admin-table.ts`), which has
 * no test runner yet (W-45). Imported by relative path so the real module runs.
 * Move once W-45 lands.
 */
import { describe, it, expect } from 'vitest';
import {
  nextSort, sortRows, searchRows, filterByDate, applyTableState, formatTableDate,
} from '../../../web-fe/lib/admin-table';

type Row = { id: number; name: string; price?: string; createdAt?: string; endsAt?: string | null; category?: { name: string } };

const rows: Row[] = [
  { id: 1, name: 'Dragon', price: '1200', createdAt: '2026-08-01T10:00:00Z', category: { name: 'Mythical' } },
  { id: 2, name: 'apple',  price: '9',    createdAt: '2026-08-05T10:00:00Z', category: { name: 'Fruit' } },
  { id: 3, name: 'Bear',   price: '300',  createdAt: '2026-08-10T10:00:00Z', category: { name: 'Animals' } },
];

describe('nextSort', () => {
  it('starts a new column ascending', () => {
    expect(nextSort({ key: null, direction: 'asc' }, 'name')).toEqual({ key: 'name', direction: 'asc' });
    expect(nextSort({ key: 'price', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' });
  });

  it('cycles asc → desc → unsorted on the same column', () => {
    const first = nextSort({ key: null, direction: 'asc' }, 'name');
    const second = nextSort(first, 'name');
    const third = nextSort(second, 'name');
    expect(second).toEqual({ key: 'name', direction: 'desc' });
    // The third state is what returns the list to the API's own order — without
    // it there is no way back to "newest first".
    expect(third.key).toBeNull();
  });
});

describe('sortRows', () => {
  it('leaves the order alone when nothing is sorted', () => {
    expect(sortRows(rows, { key: null, direction: 'asc' }).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('sorts text case-insensitively', () => {
    // Naive sorting puts every capital before every lowercase: Bear, Dragon, apple.
    expect(sortRows(rows, { key: 'name', direction: 'asc' }).map((r) => r.name))
      .toEqual(['apple', 'Bear', 'Dragon']);
  });

  it('sorts numeric strings as numbers', () => {
    // DECIMAL columns arrive as strings; as text, 9 would sort after 1200.
    expect(sortRows(rows, { key: 'price', direction: 'asc' }).map((r) => r.price))
      .toEqual(['9', '300', '1200']);
  });

  it('sorts ISO dates chronologically', () => {
    expect(sortRows(rows, { key: 'createdAt', direction: 'desc' }).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('reaches nested fields', () => {
    expect(sortRows(rows, { key: 'category.name', direction: 'asc' }).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('sinks empty values to the bottom in BOTH directions', () => {
    // A campaign with no end date is open-ended, not "the earliest" — putting it
    // first would make the top of the table meaningless.
    const withGaps: Row[] = [
      { id: 1, name: 'a', endsAt: null },
      { id: 2, name: 'b', endsAt: '2026-08-01T00:00:00Z' },
      { id: 3, name: 'c', endsAt: '2026-09-01T00:00:00Z' },
    ];
    expect(sortRows(withGaps, { key: 'endsAt', direction: 'asc' }).map((r) => r.id)).toEqual([2, 3, 1]);
    expect(sortRows(withGaps, { key: 'endsAt', direction: 'desc' }).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('does not mutate the input', () => {
    const input = [...rows];
    sortRows(input, { key: 'name', direction: 'desc' });
    expect(input.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('searchRows', () => {
  it('matches case-insensitively across the given fields', () => {
    expect(searchRows(rows, 'DRA', ['name']).map((r) => r.id)).toEqual([1]);
    expect(searchRows(rows, 'fruit', ['category.name']).map((r) => r.id)).toEqual([2]);
  });

  it('returns everything for a blank or whitespace query', () => {
    expect(searchRows(rows, '', ['name'])).toHaveLength(3);
    expect(searchRows(rows, '   ', ['name'])).toHaveLength(3);
  });

  it('returns nothing when a term matches no field', () => {
    expect(searchRows(rows, 'zzz', ['name'])).toHaveLength(0);
  });
});

describe('filterByDate', () => {
  it('includes both ends of the range', () => {
    // Picking the 5th for both ends means "things from the 5th", not midnight.
    const result = filterByDate(rows, 'createdAt', { from: '2026-08-05', to: '2026-08-05' });
    expect(result.map((r) => r.id)).toEqual([2]);
  });

  it('supports an open-ended range', () => {
    expect(filterByDate(rows, 'createdAt', { from: '2026-08-05' }).map((r) => r.id)).toEqual([2, 3]);
    expect(filterByDate(rows, 'createdAt', { to: '2026-08-05' }).map((r) => r.id)).toEqual([1, 2]);
  });

  it('returns everything when no bound is set', () => {
    expect(filterByDate(rows, 'createdAt', {})).toHaveLength(3);
  });

  it('excludes rows with no date — absence cannot satisfy a date filter', () => {
    const withGap = [...rows, { id: 4, name: 'undated' }];
    expect(filterByDate(withGap, 'createdAt', { from: '2026-01-01' }).map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('applyTableState', () => {
  it('filters before it sorts, so paging sees the final order', () => {
    const result = applyTableState(rows, {
      search: 'a',
      searchFields: ['name'],
      dateField: 'createdAt',
      dateRange: { from: '2026-08-01' },
      sort: { key: 'name', direction: 'asc' },
    });
    expect(result.map((r) => r.name)).toEqual(['apple', 'Bear', 'Dragon']);
  });

  it('is a no-op with no options', () => {
    expect(applyTableState(rows, {}).map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('formatTableDate', () => {
  it('renders an em dash rather than "Invalid Date"', () => {
    expect(formatTableDate(null)).toBe('—');
    expect(formatTableDate(undefined)).toBe('—');
    expect(formatTableDate('not-a-date')).toBe('—');
  });

  it('formats a real date', () => {
    expect(formatTableDate('2026-08-06T10:00:00Z')).toMatch(/2026/);
  });
});
