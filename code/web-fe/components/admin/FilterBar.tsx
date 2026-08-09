'use client';

/**
 * The single query panel for every admin list.
 *
 * Two rules it exists to enforce:
 *  1. Every control carries a visible <Label> — an unlabelled date box next to
 *     an unlabelled dropdown is a guess, not a filter.
 *  2. Nothing is queried while the admin is still choosing. Edits live in local
 *     draft state and are only lifted to the page when "Apply" is pressed, so a
 *     half-typed search never triggers a fetch or re-filters the table.
 */

import { useState } from 'react';
import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { DateRange } from '@/lib/admin-table';

export interface FilterFieldDef {
  /** Key in the `values` record. */
  key: string;
  label: string;
  /** `select` needs `options`; `text` and `date` do not. */
  type?: 'select' | 'text' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterBarProps {
  /** Committed search term (owned by the page). Omit both to hide the search box. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;

  /** Date-range filter. Omit `dateRange` to hide it entirely. */
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  dateField?: string;
  onDateFieldChange?: (field: string) => void;
  dateFieldOptions?: { value: string; label: string }[];

  /** Page-specific filters, declared as data so they get labels for free. */
  fields?: FilterFieldDef[];
  values?: Record<string, string>;
  onValuesChange?: (values: Record<string, string>) => void;

  /** Runs after a successful Apply or Reset — usually `() => setPage(1)`. */
  onApplied?: () => void;
}

interface Draft {
  search: string;
  range: DateRange;
  field: string;
  values: Record<string, string>;
}

const EMPTY: Record<string, string> = {};

export default function FilterBar({
  search = '',
  onSearchChange,
  searchLabel = 'Search',
  searchPlaceholder = 'Search…',
  dateRange,
  onDateRangeChange,
  dateField,
  onDateFieldChange,
  dateFieldOptions,
  fields = [],
  values = EMPTY,
  onValuesChange,
  onApplied,
}: FilterBarProps) {
  const showSearch = !!onSearchChange;
  const showDates = !!dateRange && !!onDateRangeChange;
  const showDateField = !!dateFieldOptions && dateFieldOptions.length > 1 && !!onDateFieldChange;

  /**
   * The committed filters, flattened to a string. Pages pass `values={{ status }}`,
   * a fresh object every render, so identity is useless here — the serialised form
   * is what tells a real change apart from a re-render.
   */
  const committed = JSON.stringify({
    search,
    from: dateRange?.from ?? '',
    to: dateRange?.to ?? '',
    field: dateField ?? '',
    values,
  });

  const [snapshot, setSnapshot] = useState(committed);
  const [draft, setDraft] = useState<Draft>(() => ({
    search,
    range: dateRange ?? {},
    field: dateField ?? '',
    values,
  }));

  // Adjusting state during render (rather than in an effect) is the supported way
  // to re-seed the draft when the page commits filters of its own — a "Clear" button
  // elsewhere on the screen, say.
  if (snapshot !== committed) {
    setSnapshot(committed);
    setDraft({ search, range: dateRange ?? {}, field: dateField ?? '', values });
  }

  const dirty = (() => {
    if (showSearch && draft.search !== search) return true;
    if (showDates && ((draft.range.from ?? '') !== (dateRange?.from ?? '') || (draft.range.to ?? '') !== (dateRange?.to ?? ''))) return true;
    if (showDateField && draft.field !== dateField) return true;
    return fields.some((f) => (draft.values[f.key] ?? '') !== (values[f.key] ?? ''));
  })();

  const active = !!search
    || !!dateRange?.from
    || !!dateRange?.to
    || fields.some((f) => values[f.key] && values[f.key] !== (f.options?.[0]?.value ?? ''));

  function apply(event: React.FormEvent) {
    event.preventDefault();
    if (showSearch) onSearchChange!(draft.search);
    if (showDates) onDateRangeChange!(draft.range);
    if (showDateField) onDateFieldChange!(draft.field);
    if (fields.length) onValuesChange?.(draft.values);
    onApplied?.();
  }

  function reset() {
    const cleared = Object.fromEntries(
      fields.map((f) => [f.key, f.options?.[0]?.value ?? '']),
    );
    setDraft({ search: '', range: {}, field: draft.field, values: cleared });

    if (showSearch) onSearchChange!('');
    if (showDates) onDateRangeChange!({});
    if (fields.length) onValuesChange?.(cleared);
    onApplied?.();
  }

  function setValue(key: string, value: string) {
    setDraft((current) => ({ ...current, values: { ...current.values, [key]: value } }));
  }

  return (
    <Card className="mb-4 gap-0 py-0">
      <CardContent className="p-4">
        <form onSubmit={apply}>
          <div className="flex flex-wrap items-end gap-3">
            {showSearch && (
              <div className="min-w-[14rem] flex-1 space-y-1.5">
                <Label htmlFor="filter-search">{searchLabel}</Label>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <Input
                    id="filter-search"
                    value={draft.search}
                    onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                    placeholder={searchPlaceholder}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {fields.map((field) => (
              <div key={field.key} className="min-w-[10rem] space-y-1.5">
                <Label htmlFor={`filter-${field.key}`}>{field.label}</Label>
                {field.type === 'select' || !field.type ? (
                  <NativeSelect
                    id={`filter-${field.key}`}
                    value={draft.values[field.key] ?? field.options?.[0]?.value ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    id={`filter-${field.key}`}
                    type={field.type}
                    value={draft.values[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {showDateField && (
              <div className="min-w-[10rem] space-y-1.5">
                <Label htmlFor="filter-date-field">Date field</Label>
                <NativeSelect
                  id="filter-date-field"
                  value={draft.field}
                  onChange={(e) => setDraft((d) => ({ ...d, field: e.target.value }))}
                >
                  {dateFieldOptions!.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
            )}

            {showDates && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-from">From date</Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={draft.range.from ?? ''}
                    // Stops the picker offering a start date after the end date.
                    max={draft.range.to || undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, range: { ...d.range, from: e.target.value || undefined } }))}
                    className="w-[10rem]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-to">To date</Label>
                  <Input
                    id="filter-date-to"
                    type="date"
                    value={draft.range.to ?? ''}
                    min={draft.range.from || undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, range: { ...d.range, to: e.target.value || undefined } }))}
                    className="w-[10rem]"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={!dirty}>
                <SlidersHorizontal size={14} /> Apply
              </Button>
              {(active || dirty) && (
                <Button type="button" size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw size={14} /> Reset
                </Button>
              )}
            </div>
          </div>

          {dirty && (
            <p className="mt-2 text-xs text-text-muted">
              Filters changed — press Apply to run the query.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
