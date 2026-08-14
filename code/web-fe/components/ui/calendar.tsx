'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const NAV_BTN = 'inline-flex items-center justify-center size-7 rounded-md text-text-muted hover:bg-surface-alt hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a?: Date | null, b?: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface CalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  defaultMonth?: Date;
  fromYear?: number;
  toYear?: number;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function Calendar({
  selected, onSelect, defaultMonth, fromYear, toYear, minDate, maxDate, className,
}: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(startOfMonth(defaultMonth ?? selected ?? new Date()));
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const leading = (first.getDay() + 6) % 7; // Monday-based
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));

  const minY = fromYear ?? year - 100;
  const maxY = toYear ?? year + 10;
  const years: number[] = [];
  for (let y = maxY; y >= minY; y--) years.push(y);

  function disabled(d: Date): boolean {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  }

  return (
    <div className={cn('w-64 select-none', className)}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" className={NAV_BTN} onClick={() => setMonth(new Date(year, m - 1, 1))} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <select
            value={m}
            onChange={(e) => setMonth(new Date(year, Number(e.target.value), 1))}
            className="rounded-md border border-border bg-surface px-1.5 py-1 text-sm text-text focus:outline-none focus:border-brand"
            aria-label="Month"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setMonth(new Date(Number(e.target.value), m, 1))}
            className="rounded-md border border-border bg-surface px-1.5 py-1 text-sm text-text focus:outline-none focus:border-brand"
            aria-label="Year"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" className={NAV_BTN} onClick={() => setMonth(new Date(year, m + 1, 1))} aria-label="Next month">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-xs font-medium text-text-faint">{w}</span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          const off = disabled(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={off}
              onClick={() => onSelect?.(d)}
              className={cn(
                'flex h-8 items-center justify-center rounded-md text-sm transition-colors',
                off && 'opacity-30 cursor-not-allowed',
                !off && !isSel && 'text-text hover:bg-surface-alt',
                isToday && !isSel && 'font-semibold text-brand',
                isSel && 'bg-brand text-white hover:bg-brand-light',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
