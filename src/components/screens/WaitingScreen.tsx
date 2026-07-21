import { Check, Copy, Hourglass } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { assets } from '../../assets/manifest';
import { useGameStore } from '../../game/store';
import { Button } from '../ui/Button';
import splash from './SplashScreen.module.css';
import styles from './WaitingScreen.module.css';

/** The invite URL: this page's own address with the match id appended, so the
 * link opens straight into the join flow. */
function inviteUrl(matchId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?match=${matchId}`;
}

function Backdrop() {
  return (
    <>
      <img className={splash.wall} src={assets.backdrop.wall} alt="" aria-hidden />
      <div className={splash.lamplight} aria-hidden />
      <div className={splash.vignette} aria-hidden />
    </>
  );
}

/** Seat A after creating an invite match: share the link, wait for a challenger.
 * The store polls in the background and flips the phase the moment they join. */
export function WaitingScreen() {
  const matchId = useGameStore((s) => s.matchId);
  const playAgain = useGameStore((s) => s.playAgain);
  const [copied, setCopied] = useState(false);
  const url = matchId ? inviteUrl(matchId) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={splash.screen} data-testid="waiting-screen">
      <Backdrop />
      <div className={splash.scroll}>
        <div className={splash.column}>
          <h1 className={styles.title}>Waiting for a challenger</h1>
          <div className={styles.linkRow}>
            <input
              className={styles.linkField}
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Invite link"
              data-testid="invite-link"
            />
            <button
              type="button"
              className={styles.copyIcon}
              onClick={copy}
              aria-label={copied ? 'Copied' : 'Copy invite link'}
              data-testid="copy-invite"
            >
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
            </button>
          </div>
          <motion.div
            className={styles.hourglass}
            aria-hidden
            animate={{ rotate: [0, 0, 180, 180, 360] }}
            transition={{
              duration: 2.6,
              ease: 'easeInOut',
              times: [0, 0.42, 0.5, 0.92, 1],
              repeat: Number.POSITIVE_INFINITY,
            }}
          >
            <Hourglass size={28} />
          </motion.div>
          <Button variant="secondary" onClick={playAgain} data-testid="leave-waiting">
            Never mind
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Seat B, mid-join: a brief holding screen while the seat is claimed. */
export function JoiningScreen() {
  return (
    <div className={splash.screen} data-testid="joining-screen">
      <Backdrop />
      <div className={splash.scroll}>
        <div className={splash.column}>
          <h1 className={styles.title}>Taking your seat…</h1>
          <p className={styles.blurb}>The dice are being dealt.</p>
        </div>
      </div>
    </div>
  );
}
