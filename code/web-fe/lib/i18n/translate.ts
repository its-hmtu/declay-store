import { dictionaries, en, DEFAULT_LOCALE, LOCALES, type Locale, type TranslationKey } from './dictionaries';

/** Narrow an arbitrary string (cookie value) to a supported locale. */
export function resolveLocale(value?: string | null): Locale {
  return (LOCALES as readonly string[]).includes(value ?? '') ? (value as Locale) : DEFAULT_LOCALE;
}

/**
 * Look up a key and interpolate {placeholders}. Falls back to English, then to the
 * key itself, so a missing translation is visible but never breaks the page.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const template = dictionaries[locale]?.[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/** Bound translator for a locale. */
export function createTranslator(locale: Locale) {
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}
