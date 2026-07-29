import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALES, LOCALE_META, type Locale } from '../../i18n/localeMeta';
import styles from './LanguageMenu.module.css';

/** Tiny, cross-platform flags (emoji flags render as letters on Windows). */
function Flag({ locale }: { locale: Locale }) {
  if (locale === 'hr') {
    return (
      <svg className={styles.flag} viewBox="0 0 24 16" aria-hidden>
        <rect width="24" height="16" fill="#ffffff" />
        <rect width="24" height="5.34" fill="#ff0000" />
        <rect width="24" height="5.34" y="10.66" fill="#171796" />
        <rect x="9" y="4" width="6" height="6" fill="#ffffff" stroke="#ff0000" strokeWidth="0.9" />
      </svg>
    );
  }
  return (
    <svg className={styles.flag} viewBox="0 0 24 16" aria-hidden>
      <rect width="24" height="16" fill="#b22234" />
      <rect width="24" height="2.29" y="2.29" fill="#ffffff" />
      <rect width="24" height="2.29" y="6.86" fill="#ffffff" />
      <rect width="24" height="2.29" y="11.43" fill="#ffffff" />
      <rect width="10" height="8.6" fill="#3c3b6e" />
    </svg>
  );
}

/** Flag + chevron dropdown, pinned to the splash's top-right. Switching locale
 * is persisted by the language detector's localStorage cache. */
export function LanguageMenu() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = i18n.resolvedLanguage as Locale;
  const current: Locale = LOCALES.includes(active) ? active : 'en';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (lng: Locale) => {
    void i18n.changeLanguage(lng);
    setOpen(false);
  };

  return (
    <div className={styles.menu} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.menu')}
        data-testid="language-menu"
      >
        <Flag locale={current} />
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul className={styles.list} role="listbox" aria-label={t('lang.menu')}>
          {LOCALES.map((lng) => (
            <li key={lng}>
              <button
                type="button"
                className={styles.option}
                role="option"
                aria-selected={lng === current}
                onClick={() => pick(lng)}
                data-testid={`lang-${lng}`}
              >
                <Flag locale={lng} />
                <span>{LOCALE_META[lng].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
