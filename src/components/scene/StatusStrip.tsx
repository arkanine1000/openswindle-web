import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './StatusStrip.module.css';

interface StatusStripProps {
  children: ReactNode;
  onClick?: () => void;
  testId?: string;
  /** 'bottom' (default) is the action bar; 'top' is the narration banner
   * under the HUD — round outcomes pin there, like the reference. */
  placement?: 'bottom' | 'top';
  /** The strip is portaled away from the control it belongs to, so a button
   * needs to name the action on its own. */
  ariaLabel?: string;
}

/** The parchment strip along a screen edge (the reference's "Bid 2 fours"
 * bar, or the top narration banner). With onClick it's the turn's primary
 * action. Portaled to <body>: the strip is fixed-position, and an ancestor
 * with a mask (the conversation column's top fade) would otherwise become
 * its containing block and mask it out of existence. */
export function StatusStrip({
  children,
  onClick,
  testId,
  placement = 'bottom',
  ariaLabel,
}: StatusStripProps) {
  const className = placement === 'top' ? `${styles.strip} ${styles.top}` : styles.strip;
  const strip = onClick ? (
    <button
      type="button"
      className={className}
      onClick={onClick}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ) : (
    <div className={className} data-testid={testId}>
      {children}
    </div>
  );
  return createPortal(strip, document.body);
}
