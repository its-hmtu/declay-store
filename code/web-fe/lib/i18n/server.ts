import { cookies } from 'next/headers';
import { createTranslator, resolveLocale } from './translate';
import { LOCALE_COOKIE } from './LocaleProvider';

/** Locale + translator for server components (reads the cookie). */
export async function getServerLocale() {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);
  return { locale, t: createTranslator(locale) };
}
