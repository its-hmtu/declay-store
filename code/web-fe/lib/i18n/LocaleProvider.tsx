'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createTranslator, resolveLocale } from './translate';
import type { Locale, TranslationKey } from './dictionaries';

const COOKIE = 'declay_locale';
const MAX_AGE = 60 * 60 * 24 * 365;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${next}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
    // Server components read the cookie, so refresh to re-render them in the new language.
    location.reload();
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: createTranslator(locale) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Translations inside client components. Falls back to the default locale outside a provider. */
export function useT() {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  const locale = resolveLocale(undefined);
  return { locale, setLocale: () => {}, t: createTranslator(locale) };
}

export const LOCALE_COOKIE = COOKIE;
