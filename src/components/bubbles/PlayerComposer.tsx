import { useEffect, useMemo, useState } from 'react';
import type { Bid, Move } from '../../api/types';
import { enumerateBids, spokenBid } from '../../game/bids';
import { itemSelectable, type CarouselItem } from '../../game/carousel';
import { markTalkUsed, pickTalk, talkLevel } from '../../game/tableTalk';
import { StatusStrip } from '../scene/StatusStrip';
import { BidCarousel } from './BidCarousel';
import { SpeechBubble } from './SpeechBubble';
import styles from './PlayerComposer.module.css';

interface PlayerComposerProps {
  currentBid: Bid | null;
  startTotal: number;
  currentTotal: number;
  /** Auto table talk: canned phrases picked to match the bid's boldness. */
  autoTalk: boolean;
  onToggleAutoTalk: () => void;
  onMove: (move: Move, talk: string | null) => void;
}

/**
 * The player's turn, in one bubble: optional table talk (the engine only
 * accepts it attached to a move) above the drag carousel, with CALL! as the
 * strip's first entry. Rendered inside the conversation column — it holds
 * the newest slot until the move is made. The status strip below doubles as
 * the confirm button; Enter in the talk field confirms too.
 */
export function PlayerComposer({
  currentBid,
  startTotal,
  currentTotal,
  autoTalk,
  onToggleAutoTalk,
  onMove,
}: PlayerComposerProps) {
  const items = useMemo<CarouselItem[]>(() => {
    const bids = enumerateBids(currentBid, startTotal, currentTotal).map(
      (option): CarouselItem => ({ kind: 'bid', option }),
    );
    // No call on a round-opening turn: there is nothing to challenge.
    return currentBid !== null ? [{ kind: 'call' }, ...bids] : bids;
  }, [currentBid, startTotal, currentTotal]);

  // Center the lowest legal raise; CALL! waits one notch to the left.
  const initialArmed = useMemo(() => {
    const firstBid = items.findIndex((item) => item.kind === 'bid' && item.option.selectable);
    return firstBid === -1 ? 0 : firstBid;
  }, [items]);

  const [armed, setArmed] = useState(initialArmed);
  const [talk, setTalk] = useState('');

  useEffect(() => setArmed(initialArmed), [initialArmed, items]);

  const armedItem = items[armed];

  /* Auto talk previews the phrase the armed bid would ship with, re-picked
   * only when the bid crosses into a new register. Calls go out silent —
   * the canned lines are bid talk. */
  const armedLevel =
    armedItem?.kind === 'bid' ? talkLevel(armedItem.option.bid.quantity, currentTotal) : null;
  const autoPhrase = useMemo(
    () => (autoTalk && armedLevel !== null ? pickTalk(armedLevel) : null),
    [autoTalk, armedLevel],
  );

  const talkOrNull = autoTalk ? autoPhrase : talk.trim() ? talk.trim() : null;

  const submit = (item: CarouselItem | undefined) => {
    if (!item || !itemSelectable(item)) return;
    if (item.kind === 'call') {
      onMove({ action: 'call' }, autoTalk ? null : talkOrNull);
    } else {
      // Previews don't count as used — only a phrase that actually ships.
      if (autoTalk && autoPhrase) markTalkUsed(autoPhrase);
      onMove({ action: 'bid', bid: item.option.bid }, talkOrNull);
    }
  };

  const stripLabel =
    armedItem?.kind === 'call'
      ? 'Call!'
      : armedItem?.kind === 'bid' && armedItem.option.selectable
        ? `Bid ${spokenBid(armedItem.option.bid)}`
        : null;

  return (
    <>
      <SpeechBubble tail="player" testId="player-composer" className={styles.bubble}>
        <span className={styles.talkRow}>
          <button
            type="button"
            className={styles.talkToggle}
            onClick={onToggleAutoTalk}
            aria-pressed={autoTalk}
            aria-label="Let the game talk for you"
            title="Auto table talk"
            data-testid="talk-toggle"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
              <path
                d="M3 2.5 h14 a1.5 1.5 0 0 1 1.5 1.5 v8 a1.5 1.5 0 0 1 -1.5 1.5 h-9.5 l-4 4 v-4 H3 a1.5 1.5 0 0 1 -1.5 -1.5 v-8 A1.5 1.5 0 0 1 3 2.5 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="6.5" cy="8" r="1.1" fill="currentColor" />
              <circle cx="10" cy="8" r="1.1" fill="currentColor" />
              <circle cx="13.5" cy="8" r="1.1" fill="currentColor" />
            </svg>
          </button>
          <input
            className={styles.talk}
            type="text"
            value={autoTalk ? (autoPhrase ?? '') : talk}
            onChange={(e) => setTalk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(armedItem);
            }}
            placeholder={autoTalk ? '' : 'Say something…'}
            maxLength={280}
            disabled={autoTalk}
            data-testid="talk-input"
          />
        </span>
        <BidCarousel items={items} armedIndex={armed} onArm={setArmed} onSubmit={submit} />
      </SpeechBubble>
      {stripLabel ? (
        <StatusStrip onClick={() => submit(armedItem)} testId="confirm-strip">
          {stripLabel}
        </StatusStrip>
      ) : (
        <StatusStrip testId="confirm-strip">
          {currentBid ? 'No bid left to make — call!' : 'Choose your opening bid'}
        </StatusStrip>
      )}
    </>
  );
}
