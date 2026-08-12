/** The supported locales. Adding a language = add its code here, a locale
 * file under locales/, a row in LOCALE_META, and (if it needs different design
 * metrics) a :lang() block in tokens.css — no component changes. */
export const LOCALES = ['en', 'hr'] as const;
export type Locale = (typeof LOCALES)[number];

export const FALLBACK_LOCALE: Locale = 'en';

export interface LocaleInfo {
  /** Endonym shown in the language menu. */
  label: string;
  /** Flag emoji for language selector. */
  flag: string;
  /** JS-only design metric: the auto-talk bubble's character budget. Anything
   * CSS can express (the CTA slot width, per-locale font nudges) lives in
   * tokens.css behind :lang() instead of here. */
  maxTalkLength: number;
}

export const LOCALE_META: Record<Locale, LocaleInfo> = {
  en: { label: 'English', flag: '🇺🇸', maxTalkLength: 25 },
  hr: { label: 'Hrvatski', flag: '🇭🇷', maxTalkLength: 25 },
};
