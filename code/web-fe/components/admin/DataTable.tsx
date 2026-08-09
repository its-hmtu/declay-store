'use client';

/**
 * M-48: the admin's one table.
 *
 * Every list screen had its own `<table>`, so "sortable columns" would have meant
 * writing the same header logic nineteen times and getting it subtly different
 * nineteen ways. Columns are declared as data; sorting, empty states and the
 * created/updated columns come for free.
 */

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronRight } from 'lucide-react';
import type { SortState } from '@/lib/admin-table';
import { nextSort, formatTableDate } from '@/lib/admin-table';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T> {
  key: string;
  header: string;
  /** Omit to render `row[key]` as text. */
  render?: (row: T) => React.ReactNode;
  /** Sorting is opt-in — an actions column has nothing to sort by. */
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

/**
 * Created/updated on every list, as required. Declared here so the wording and
 * format cannot drift between screens.
 */
export function timestampColumns<T extends { createdAt?: string; updatedAt?: string }>(): Column<T>[] {
  return [
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      className: 'text-text-muted text-xs whitespace-nowrap',
      render: (row) => formatTableDate(row.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      className: 'text-text-muted text-xs whitespace-nowrap',
      render: (row) => formatTableDate(row.updatedAt),
    },
  ];
}

export default function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  loading = false,
  emptyMessage = 'Nothing to show yet.',
  actions,
  expandedRows,
  isExpandable,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  sort?: SortState;
  onSortChange?: (next: SortState) => void;
  loading?: boolean;
  emptyMessage?: string;
  /** Right-aligned per-row controls (edit, delete). */
  actions?: (row: T) => React.ReactNode;
  /**
   * M-48b: detail rows shown underneath a parent — product variants are the
   * reason. Must return `<tr>` elements: rendering them into the SAME table is
   * what keeps a variant's price under the parent's price column. A `colSpan`
   * drawer would have been simpler and would have aligned with nothing.
   *
   * Collapsed by default — a catalogue where every product fans out into its
   * variants is unreadable, and most products here have only one.
   */
  expandedRows?: (row: T) => React.ReactNode;
  /** Rows with nothing to show get no toggle rather than an empty drawer. */
  isExpandable?: (row: T) => boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());

  function toggle(key: string | number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function headerButton(column: Column<T>) {
    const active = sort?.key === column.key;
    const Icon = !active ? ChevronsUpDown : sort?.direction === 'asc' ? ChevronUp : ChevronDown;

    return (
      <button
        type="button"
        onClick={() => onSortChange?.(nextSort(sort ?? { key: null, direction: 'asc' }, column.key))}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? 'text-text' : 'hover:text-text'
        }`}
      >
        {column.header}
        <Icon size={12} className={active ? 'text-brand' : 'text-text-faint'} />
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-9 w-full last:mb-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-xs uppercase tracking-wider text-text-muted">
            {expandedRows && <th className="w-8 px-2 py-3" />}
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 text-left font-medium ${column.headerClassName ?? ''}`}>
                {column.sortable && onSortChange ? headerButton(column) : column.header}
              </th>
            ))}
            {actions && <th className="px-4 py-3" />}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0) + (expandedRows ? 1 : 0)}
                className="px-4 py-12 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const canExpand = !!expandedRows && (isExpandable?.(row) ?? true);
              const isOpen = expanded.has(key);

              return (
                <Fragment key={key}>
                  <tr className="border-b border-border last:border-0 hover:bg-surface-alt/50">
                    {expandedRows && (
                      <td className="px-2 py-3 align-middle">
                        {canExpand && (
                          <button
                            type="button"
                            onClick={() => toggle(key)}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? 'Collapse' : 'Expand'}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
                          >
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        )}
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className={`px-4 py-3 ${column.className ?? 'text-text'}`}>
                        {column.render
                          ? column.render(row)
                          : String((row as Record<string, unknown>)[column.key] ?? '—')}
                      </td>
                    ))}
                    {actions && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">{actions(row)}</td>
                    )}
                  </tr>

                  {canExpand && isOpen && expandedRows(row)}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
