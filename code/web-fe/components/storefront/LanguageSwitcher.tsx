'use client';

import { useT } from '@/lib/i18n/LocaleProvider';

/** M-11: compact VI/EN toggle — the shop launches in Vietnamese. */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useT();

  return (
    <div className="flex items-center font-mono text-xs text-text-muted">
      <button
        type="button"
        onClick={() => setLocale('vi')}
        className={locale === 'vi' ? 'text-text font-semibold' : 'hover:text-text transition-colors'}
        aria-label="Tiếng Việt"
      >
        VI
      </button>
      <span className="mx-1 text-text-faint">/</span>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={locale === 'en' ? 'text-text font-semibold' : 'hover:text-text transition-colors'}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
