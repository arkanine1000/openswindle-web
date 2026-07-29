import i18n from './index';

/** Number formatting bound to the active locale — HR gets comma decimals and
 * dot grouping automatically. One place, so future locales format for free. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, options).format(value);
}

/** Fixed-decimal number in the active locale (replaces `.toFixed(n)`). */
export function formatFixed(value: number, digits: number): string {
  return formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
