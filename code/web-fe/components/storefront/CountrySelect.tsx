'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRY_CODES, type CountryCode } from '@/lib/countryCodes';

// Real flag images (Windows does not render flag emoji). Served from flagcdn.
function flagUrl(iso: string, retina = false): string {
  return `https://flagcdn.com/${retina ? '48x36' : '24x18'}/${iso.toLowerCase()}.png`;
}

interface Props {
  value: CountryCode;
  onChange: (c: CountryCode) => void;
}

export default function CountrySelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open} aria-label="Select country dial code"
        className="flex items-center gap-1.5 px-2.5 py-2.5 border border-border rounded-lg bg-surface text-text focus:outline-none focus:border-brand"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(value.iso)} srcSet={`${flagUrl(value.iso, true)} 2x`} alt={value.name} width={24} height={18} className="rounded-sm" />
        <span className="text-sm">{value.dial}</span>
        <ChevronDown size={14} className="text-text-faint" />
      </button>

      {open && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-64 overflow-auto rounded-lg border border-border bg-surface shadow-lg py-1">
          {COUNTRY_CODES.map((c) => (
            <li key={c.iso}>
              <button
                type="button" role="option" aria-selected={c.iso === value.iso}
                onClick={() => { onChange(c); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-alt ${c.iso === value.iso ? 'bg-brand-faint' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(c.iso)} srcSet={`${flagUrl(c.iso, true)} 2x`} alt={c.name} width={24} height={18} className="rounded-sm shrink-0" />
                <span className="flex-1 text-text">{c.name}</span>
                <span className="text-text-faint">{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
