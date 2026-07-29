import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { FALLBACK_LOCALE, LOCALES, type Locale } from './localeMeta';
import { en } from './locales/en';
import { hr } from './locales/hr';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hr: { translation: hr } },
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: [...LOCALES],
    // Map system locales like "en-US"/"hr-HR" onto our base codes.
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'openswindle-locale',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    // Dev-only guard: shout about any key that wasn't found.
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (lngs, ns, key) => console.warn(`[i18n] missing "${ns}:${key}" for ${lngs.join(', ')}`)
      : undefined,
  });

/** Keep <html lang> in step so CSS `:lang()` hooks and screen readers follow
 * the active language — this is what drives locale-specific design metrics
 * (e.g. the CTA reel's slot width) from tokens.css rather than component JS. */
function syncHtmlLang(lng: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.split('-')[0] || FALLBACK_LOCALE;
  }
}
syncHtmlLang(i18n.resolvedLanguage ?? i18n.language ?? FALLBACK_LOCALE);
i18n.on('languageChanged', syncHtmlLang);

/** The active locale as one of our supported codes — for sending to the API
 * (so the NPC reasons in the player's language) and other non-render callers. */
export function currentLocale(): Locale {
  const base = (i18n.resolvedLanguage ?? i18n.language ?? FALLBACK_LOCALE).split('-')[0] ?? '';
  return (LOCALES as readonly string[]).includes(base) ? (base as Locale) : FALLBACK_LOCALE;
}

export default i18n;
