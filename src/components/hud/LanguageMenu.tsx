import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALES, LOCALE_META, type Locale } from '../../i18n/localeMeta';
import styles from './LanguageMenu.module.css';

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
        <span className={styles.flag} aria-hidden>
          {LOCALE_META[current].flag}
        </span>
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
                <span className={styles.flag} aria-hidden>
                  {LOCALE_META[lng].flag}
                </span>
                <span>{LOCALE_META[lng].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
