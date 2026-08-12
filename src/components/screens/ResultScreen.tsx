import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Face } from '../../api/types';
import { otherSeat } from '../../api/types';
import { spokenBid } from '../../game/bids';
import { useGameStore } from '../../game/store';
import { Die } from '../scene/Die';
import { Button } from '../ui/Button';
import styles from './ResultScreen.module.css';

export function ResultScreen() {
  const { t } = useTranslation();
  const outcome = useGameStore((s) => s.outcome) ?? 'abandoned';
  const npcName = useGameStore((s) => s.npcName);
  const view = useGameStore((s) => s.view);
  const mySeat = useGameStore((s) => s.mySeat);
  const isHuman = useGameStore((s) => s.isHuman);
  const showAutopsy = useGameStore((s) => s.showAutopsy);
  const playAgain = useGameStore((s) => s.playAgain);
  const copy = {
    win: { title: t('result.winTitle'), line: t('result.winLine') },
    defeat: { title: t('result.defeatTitle'), line: t('result.defeatLine') },
    abandoned: { title: t('result.abandonedTitle'), line: t('result.abandonedLine') },
  }[outcome];
  const lastReveal = view?.reveals.at(-1) ?? null;
  const opponentSeat = otherSeat(mySeat);

  return (
    <div className={styles.screen} data-testid="result-screen" data-outcome={outcome}>
      <motion.h1
        className={outcome === 'win' ? styles.titleWin : styles.titleDefeat}
        initial={{ scale: 2.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 210, damping: 20 }}
      >
        {copy.title}
      </motion.h1>
      <motion.p
        className={styles.line}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {copy.line}
      </motion.p>

      {lastReveal && (
        <motion.div
          className={styles.recap}
          data-testid="result-recap"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <p className={styles.recapLine}>
            {t('result.lastHand', {
              bid: spokenBid(lastReveal.final_bid),
              verdict: lastReveal.bid_met ? t('result.verdictTrue') : t('result.verdictLie'),
              count: lastReveal.actual_count,
            })}
          </p>
          <div className={styles.hands}>
            <div className={styles.handRow}>
              <span>{t('result.handYou')}</span>
              <div className={styles.diceRow}>
                {lastReveal.hands[mySeat].map((face, i) => (
                  <Die key={i} face={face as Face} owner="player" small />
                ))}
              </div>
            </div>
            <div className={styles.handRow}>
              <span>{npcName || t('result.theyFallback')}</span>
              <div className={styles.diceRow}>
                {lastReveal.hands[opponentSeat].map((face, i) => (
                  <Die key={i} face={face as Face} owner="npc" small />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        className={styles.actions}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <Button onClick={showAutopsy} data-testid="continue">
          {t('result.review')}
        </Button>
        <Button variant="secondary" onClick={playAgain} data-testid="play-again">
          {t('result.playAgain')}
        </Button>
      </motion.div>
      <p className={styles.footnote}>
        {isHuman ? t('result.footnoteHuman') : t('result.footnoteBot', { opponent: npcName })}
      </p>
    </div>
  );
}
