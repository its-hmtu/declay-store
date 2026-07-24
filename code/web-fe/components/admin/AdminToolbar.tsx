'use client';

import { Search } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  /** Extra filter controls (e.g. <select>) rendered to the right of the search box. */
  children?: React.ReactNode;
}

/** Search box + slot for filter controls, shared across admin list pages. */
export default function AdminToolbar({ search, onSearch, placeholder = 'Search…', children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand placeholder:text-text-faint"
        />
      </div>
      {children}
    </div>
  );
}

const selectCls = 'px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text cursor-pointer';

/** A labelled filter <select> for the toolbar. */
export function FilterSelect({
  value, onChange, options, label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls} aria-label={label}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
