import { useEffect, useMemo, useState } from 'react';
import type { Bid, Move } from '../../api/types';
import { enumerateBids, spokenBid } from '../../game/bids';
import { itemSelectable, type CarouselItem } from '../../game/carousel';
import { StatusStrip } from '../scene/StatusStrip';
import { BidCarousel } from './BidCarousel';
import { SpeechBubble } from './SpeechBubble';
import styles from './PlayerComposer.module.css';

interface PlayerComposerProps {
  currentBid: Bid | null;
  startTotal: number;
  currentTotal: number;
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
  const talkOrNull = talk.trim() ? talk.trim() : null;

  const submit = (item: CarouselItem | undefined) => {
    if (!item || !itemSelectable(item)) return;
    if (item.kind === 'call') onMove({ action: 'call' }, talkOrNull);
    else onMove({ action: 'bid', bid: item.option.bid }, talkOrNull);
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
        <input
          className={styles.talk}
          type="text"
          value={talk}
          onChange={(e) => setTalk(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(armedItem);
          }}
          placeholder="Say something… (optional)"
          maxLength={280}
          data-testid="talk-input"
        />
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
