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
      <div className={styles.vignette} aria-hidden />
      <motion.div
        className={styles.column}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <motion.img
          className={styles.mark}
          src={assets.brand.mark}
          alt=""
          aria-hidden
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <img className={styles.title} src={assets.splash.title} alt="Swindlestones" />
        <p className={styles.tagline}>A game of dice and lies.</p>

        <fieldset className={styles.length}>
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
        </fieldset>

        <button
          type="button"
          className={styles.cta}
          onClick={sitDown}
          disabled={starting}
          data-testid="sit-down"
        >
          {starting ? 'Finding you an opponent…' : 'Sit down at the table'}
        </button>

        <details className={styles.advanced}>
          <summary>Choose your opponent</summary>
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
        </details>

        {error && (
          <p className={styles.error} role="alert" data-testid="splash-error">
            {error}
          </p>
        )}
      </motion.div>
    </div>
  );
}
