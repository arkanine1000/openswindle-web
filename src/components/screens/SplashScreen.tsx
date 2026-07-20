import { motion } from 'motion/react';
import { useState } from 'react';
import type { OpponentType } from '../../api/types';
import { assets } from '../../assets/manifest';
import { useGameStore } from '../../game/store';
import styles from './SplashScreen.module.css';

const DICE_CHOICES = [2, 3, 4, 5, 6];

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

export function SplashScreen() {
  const startMatch = useGameStore((s) => s.startMatch);
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

  return (
    <div className={styles.screen} data-testid="splash-screen">
      <img className={styles.wall} src={assets.backdrop.wall} alt="" aria-hidden />
      {/* Warm cast from the oil lamp painted into the backdrop's left side,
       * so the light in the room has a source. */}
      <div className={styles.lamplight} aria-hidden />
      <div className={styles.vignette} aria-hidden />

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
            Swindlestones
          </motion.h1>

          <motion.div className={styles.rule} variants={rise} transition={stagger} aria-hidden>
            <span />
            <i />
            <span />
          </motion.div>

          <motion.p className={styles.tagline} variants={rise} transition={stagger}>
            A game of dice and lies.
          </motion.p>

          <motion.fieldset className={styles.length} variants={rise} transition={stagger}>
            <legend>Dice apiece</legend>
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

          <motion.button
            type="button"
            className={styles.cta}
            onClick={sitDown}
            disabled={starting}
            variants={rise}
            transition={stagger}
            data-testid="sit-down"
          >
            {starting ? 'Finding you an opponent…' : 'Sit down at the table'}
          </motion.button>

          <motion.details className={styles.advanced} variants={rise} transition={stagger}>
            <summary>Choose your opponent</summary>
            <div className={styles.advancedBody}>
              <label className={styles.field}>
                Opponent seed
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="leave blank for a stranger"
                  data-testid="seed-input"
                />
              </label>
              <label className={styles.field}>
                Opponent mind
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value as OpponentType)}
                  data-testid="engine-select"
                >
                  <option value="llm">Language model</option>
                  <option value="scripted">Scripted (practice)</option>
                </select>
              </label>
              <p className={styles.hint}>
                The same seed always summons the same opponent — share it like a riddle.
              </p>
            </div>
          </motion.details>

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
