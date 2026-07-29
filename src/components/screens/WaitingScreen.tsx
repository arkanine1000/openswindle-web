import { Check, Copy, Hourglass } from 'lucide-react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const matchId = useGameStore((s) => s.matchId);
  const playAgain = useGameStore((s) => s.playAgain);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const url = matchId ? inviteUrl(matchId) : '';

  useEffect(() => {
    if (!url) {
      setQrSvg('');
      return;
    }
    let active = true;
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#1d1812',
        light: '#00000000',
      },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch((err) => {
        console.error('Failed to generate QR code SVG:', err);
      });

    return () => {
      active = false;
    };
  }, [url]);

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
          <h1 className={styles.title}>{t('waiting.title')}</h1>
          {url && (
            <div className={styles.qrCard} data-testid="qr-code" aria-label={t('waiting.ariaQr')}>
              <div className={styles.qrCornerTopLeft} aria-hidden />
              <div className={styles.qrCornerTopRight} aria-hidden />
              <div className={styles.qrCornerBottomLeft} aria-hidden />
              <div className={styles.qrCornerBottomRight} aria-hidden />
              <div
                className={styles.qrCode}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          )}
          <div className={styles.linkRow}>
            <input
              className={styles.linkField}
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={t('waiting.ariaLink')}
              data-testid="invite-link"
            />
            <button
              type="button"
              className={styles.copyIcon}
              onClick={copy}
              aria-label={copied ? t('waiting.copied') : t('waiting.copy')}
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
            {t('waiting.neverMind')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Seat B, mid-join: a brief holding screen while the seat is claimed. */
export function JoiningScreen() {
  const { t } = useTranslation();
  return (
    <div className={splash.screen} data-testid="joining-screen">
      <Backdrop />
      <div className={splash.scroll}>
        <div className={splash.column}>
          <h1 className={styles.title}>{t('waiting.joining')}</h1>
          <p className={styles.blurb}>{t('waiting.joiningSub')}</p>
        </div>
      </div>
    </div>
  );
}
