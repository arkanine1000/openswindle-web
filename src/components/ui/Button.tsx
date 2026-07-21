import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * The app's shared button. Two variants at a standard (non-hero) size:
 * `primary` is the gilded, glowing parchment CTA; `secondary` is a flat,
 * quieter parchment for cancel/dismiss actions. The splash screen keeps its
 * own oversized hero `.cta` — everything else should reach for this.
 */
export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.btn, styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
