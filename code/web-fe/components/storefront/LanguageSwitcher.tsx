'use client';

import * as React from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import Button from '@/components/ui/Button';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS: { key: 'vi' | 'en'; label: string }[] = [
  { key: 'vi', label: 'Vietnam' },
  { key: 'en', label: 'English' },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  const current = OPTIONS.find((o) => o.key === locale) ?? OPTIONS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
          <Globe className="w-4 h-4 text-text-faint" />
          <span className="font-mono text-xs text-text">{current.label}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-36 p-1">
        <div role="menu" aria-label="Language selector" className="flex flex-col">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              role="menuitem"
              type="button"
              onClick={() => setLocale(opt.key)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md',
                opt.key === locale ? 'font-semibold text-text' : 'text-text-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
