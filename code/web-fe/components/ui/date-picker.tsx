'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from './calendar';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

const TRIGGER =
  'inline-flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50';

function formatValue(d: Date | null | undefined, withTime: boolean): string {
  if (!d) return '';
  const date = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

function toTimeInput(d: Date | null | undefined): string {
  if (!d) return '00:00';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  withTime?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
  minDate?: Date;
  maxDate?: Date;
  clearable?: boolean;
}

export function DatePicker({
  value, onChange, placeholder = 'Pick a date', withTime = false,
  disabled, id, className, fromYear, toYear, minDate, maxDate, clearable = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  function handleSelect(day: Date) {
    const next = new Date(day);
    if (withTime && value) { next.setHours(value.getHours(), value.getMinutes(), 0, 0); }
    else if (withTime) { next.setHours(0, 0, 0, 0); }
    onChange(next);
    if (!withTime) setOpen(false);
  }

  function handleTime(e: React.ChangeEvent<HTMLInputElement>) {
    const [hh, mm] = e.target.value.split(':').map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(hh || 0, mm || 0, 0, 0);
    onChange(base);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" disabled={disabled} className={cn(TRIGGER, !value && 'text-text-faint', className)}>
          <CalendarIcon className="size-4 opacity-70" />
          <span className="truncate">{value ? formatValue(value, withTime) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <Calendar
          selected={value}
          onSelect={handleSelect}
          defaultMonth={value ?? undefined}
          fromYear={fromYear}
          toYear={toYear}
          minDate={minDate}
          maxDate={maxDate}
        />
        {withTime && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-text-muted">Time</span>
            <input
              type="time"
              value={toTimeInput(value)}
              onChange={handleTime}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text focus:outline-none focus:border-brand"
            />
          </div>
        )}
        {clearable && value && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="mt-2 w-full text-center text-xs text-text-muted hover:text-error"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
