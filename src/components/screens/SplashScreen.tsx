import { ChevronsUpDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OpponentType } from '../../api/types';
import { assets } from '../../assets/manifest';
import { useGameStore } from '../../game/store';
import { LanguageMenu } from '../hud/LanguageMenu';
import styles from './SplashScreen.module.css';

const DICE_CHOICES = [2, 3, 4, 5, 6];

/** Opponent kind, worn as the tail of "Play a ___". */
type Mode = 'bot' | 'pal';

function randomSeed(): string {
  return `seed-${Math.floor(Math.random() * 1_000_000)}`;
}

/** Each element enters a beat after the one above it, so the screen
 * assembles itself rather than appearing all at once. */
const rise = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0 },
};
const stagger = { duration: 0.7, ease: 'easeOut' } as const;

/** The word slides in from the direction the carousel is turning and the old
 * one slides out the far side — a two-item vertical reel. */
const wordVariants = {
  enter: (d: number) => ({ y: d > 0 ? '120%' : '-120%', opacity: 0 }),
  center: { y: '0%', opacity: 1 },
  exit: (d: number) => ({ y: d > 0 ? '-120%' : '120%', opacity: 0 }),
};

export function SplashScreen() {
  const { t } = useTranslation();
  const startMatch = useGameStore((s) => s.startMatch);
  const startHumanMatch = useGameStore((s) => s.startHumanMatch);
  const error = useGameStore((s) => s.error);
  const dismissError = useGameStore((s) => s.dismissError);
  const [dice, setDice] = useState(4);
  const [seed, setSeed] = useState('');
  const [engine, setEngine] = useState<OpponentType>('llm');
  const [starting, setStarting] = useState(false);

  const sitDown = async () => {
    setStarting(true);
    dismissError();
    await startMatch({
      dice_per_player: dice,
      opponent_type: engine,
      npc_seed: seed.trim() || randomSeed(),
    });
    setStarting(false);
  };

  const inviteFriend = async () => {
    setStarting(true);
    dismissError();
    await startHumanMatch({ dice_per_player: dice });
    setStarting(false);
  };

  // The single CTA carries a two-item reel (bot ⇄ pal). It turns three ways: a
  // chevron click, or a vertical drag/swipe across the button; `dir` only feeds
  // the slide animation.
  const [mode, setMode] = useState<Mode>('bot');
  const [dir, setDir] = useState<1 | -1>(1);
  const drag = useRef({ startY: 0, active: false, swiped: false });
  // A drag that turns the reel must not also fire the button's play click.
  const suppressClick = useRef(false);

  const cycle = (d: 1 | -1) => {
    setDir(d);
    setMode((m) => (m === 'bot' ? 'pal' : 'bot'));
  };

  const play = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    void (mode === 'bot' ? sitDown() : inviteFriend());
  };

  const onPointerDown = (e: React.PointerEvent) => {
    suppressClick.current = false;
    drag.current = { startY: e.clientY, active: true, swiped: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active || d.swiped) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 22) {
      d.swiped = true;
      suppressClick.current = true;
      cycle(dy < 0 ? 1 : -1);
    }
  };
  const endDrag = () => {
    drag.current.active = false;
  };

  // The reel slot is sized to THIS locale's longest carousel word and centres
  // both options within it — so a new language auto-sizes from its own words,
  // with no per-locale CSS and no cross-locale width clash.
  const ctaWords: Record<Mode, string> = { bot: t('splash.cta.bot'), pal: t('splash.cta.pal') };
  const ctaSlotCh = Math.max(ctaWords.bot.length, ctaWords.pal.length);

  return (
    <div className={styles.screen} data-testid="splash-screen">
      <img className={styles.wall} src={assets.backdrop.wall} alt="" aria-hidden />
      {/* Warm cast from the oil lamp painted into the backdrop's left side,
       * so the light in the room has a source. */}
      <div className={styles.lamplight} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      <LanguageMenu />

      <div className={styles.scroll}>
        <motion.div
          className={styles.column}
          initial="hidden"
          animate="shown"
          transition={{ staggerChildren: 0.12 }}
        >
          <motion.img
            className={styles.mark}
            src={assets.brand.mark}
            alt=""
            aria-hidden
            variants={{
              hidden: { opacity: 0, y: -40, rotate: -25 },
              shown: { opacity: 1, y: 0, rotate: 0 },
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          />

          <motion.h1 className={styles.title} variants={rise} transition={stagger}>
            {t('splash.title')}
          </motion.h1>

          <motion.div className={styles.rule} variants={rise} transition={stagger} aria-hidden>
            <span />
            <i />
            <span />
          </motion.div>

          <motion.p className={styles.tagline} variants={rise} transition={stagger}>
            {t('splash.tagline')}
          </motion.p>

          <motion.fieldset className={styles.length} variants={rise} transition={stagger}>
            <legend>{t('splash.diceApiece')}</legend>
            {DICE_CHOICES.map((n) => (
              <label key={n} className={styles.diceChoice} data-checked={dice === n}>
                <input
                  type="radio"
                  name="dice"
                  value={n}
                  checked={dice === n}
                  onChange={() => setDice(n)}
                />
                {n}
              </label>
            ))}
          </motion.fieldset>

          <motion.div className={styles.playArea} variants={rise} transition={stagger}>
            <div
              className={styles.playControl}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              <button
                type="button"
                className={`${styles.cta} ${styles.play}`}
                onClick={play}
                disabled={starting}
                data-testid="sit-down"
                aria-label={mode === 'bot' ? t('splash.cta.ariaBot') : t('splash.cta.ariaPal')}
              >
                <span className={styles.playText}>{t('splash.cta.prefix')}</span>
                <span className={styles.wordSlot} style={{ width: `${ctaSlotCh}ch` }} aria-hidden>
                  <AnimatePresence initial={false} custom={dir}>
                    <motion.span
                      key={mode}
                      custom={dir}
                      className={styles.word}
                      variants={wordVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                    >
                      {ctaWords[mode]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => cycle(1)}
                disabled={starting}
                aria-label={
                  mode === 'bot' ? t('splash.cta.switchToPal') : t('splash.cta.switchToBot')
                }
                data-testid="opponent-toggle"
              >
                <ChevronsUpDown size={18} aria-hidden />
              </button>
            </div>

            {/* Seed and engine only matter against a bot; they slide away for a pal.
              Absolutely placed so its expand/collapse never re-centers the column. */}
            <AnimatePresence initial={false}>
              {mode === 'bot' && (
                <motion.div
                  key="advanced"
                  className={styles.advancedWrap}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <details className={styles.advanced}>
                    <summary>{t('splash.advanced.summary')}</summary>
                    <div className={styles.advancedBody}>
                      <label className={styles.field}>
                        {t('splash.advanced.seedLabel')}
                        <input
                          type="text"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                          placeholder={t('splash.advanced.seedPlaceholder')}
                          data-testid="seed-input"
                        />
                      </label>
                      <label className={styles.field}>
                        {t('splash.advanced.mindLabel')}
                        <select
                          value={engine}
                          onChange={(e) => setEngine(e.target.value as OpponentType)}
                          data-testid="engine-select"
                        >
                          <option value="llm">{t('splash.advanced.mindLlm')}</option>
                          <option value="scripted">{t('splash.advanced.mindScripted')}</option>
                        </select>
                      </label>
                    </div>
                  </details>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {error && (
            <p className={styles.error} role="alert" data-testid="splash-error">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
