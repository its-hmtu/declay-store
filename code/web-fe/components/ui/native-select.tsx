'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Native <select> styled to match the shadcn Input/SelectTrigger.
 *
 * The Radix Select in `select.tsx` is the right choice for standalone filters,
 * but forms here drive many fields through a single `name`-based change handler.
 * A native element keeps that contract while still looking like the rest of the
 * design system.
 */
const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-9 text-sm text-text transition-colors',
        'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      size={16}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint"
    />
  </div>
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
