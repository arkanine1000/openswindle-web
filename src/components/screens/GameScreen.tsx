import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { HUMAN_SEAT, NPC_SEAT } from '../../api/types';
import { npcArtForSeed } from '../../assets/manifest';
import { spokenBid } from '../../game/bids';
import { useGameStore } from '../../game/store';
import { describeReveal, revealEntry } from '../../game/transcript';
import { BidChip } from '../bubbles/BidChip';
import { PlayerComposer } from '../bubbles/PlayerComposer';
import { SpeechBubble } from '../bubbles/SpeechBubble';
import { ThinkingBubble } from '../bubbles/ThinkingBubble';
import { HistorySheet } from '../hud/HistorySheet';
import { TopBar } from '../hud/TopBar';
import { NpcDiceReveal } from '../scene/NpcDiceReveal';
import { NpcFigure } from '../scene/NpcFigure';
import { PlayerHand } from '../scene/PlayerHand';
import { StatusStrip } from '../scene/StatusStrip';
import { TableScene } from '../scene/TableScene';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const phase = useGameStore((s) => s.phase);
  const view = useGameStore((s) => s.view);
  const npcName = useGameStore((s) => s.npcName);
  const npcSeed = useGameStore((s) => s.npcSeed);
  const npcPose = useGameStore((s) => s.npcPose);
  const feed = useGameStore((s) => s.feed);
  const activeReveal = useGameStore((s) => s.activeReveal);
  const displayedHand = useGameStore((s) => s.displayedHand);
  const displayedDiceCounts = useGameStore((s) => s.displayedDiceCounts);
  const currentBid = useGameStore((s) => s.currentBid);
  const startTotal = useGameStore((s) => s.startTotal);
  const transcript = useGameStore((s) => s.transcript);
  const error = useGameStore((s) => s.error);
  const rollDice = useGameStore((s) => s.rollDice);
  const submitPlayerMove = useGameStore((s) => s.submitPlayerMove);
  const walkAway = useGameStore((s) => s.walkAway);
  const dismissError = useGameStore((s) => s.dismissError);

  const [historyOpen, setHistoryOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const perPlayer = startTotal / 2;
  const currentTotal = displayedDiceCounts
    ? displayedDiceCounts[HUMAN_SEAT] + displayedDiceCounts[NPC_SEAT]
    : 0;
  const art = npcArtForSeed(npcSeed);
  // After a call there is nothing to "think" about — the hands come open.
  const lastUtterance = feed[feed.length - 1];
  const playerCalled = lastUtterance?.speaker === 'you' && lastUtterance.move.action === 'call';

  /* The rolling conversation window: newest utterance holds the bottom
   * slot; each arrival shifts the others up (motion layout animation) and
   * the oldest roll out. The composer and the thinking placeholder occupy
   * that same newest slot while active. */
  const spring = { type: 'spring', stiffness: 380, damping: 28 } as const;
  const bubbles = (
    <>
      <div className={styles.conversation}>
        <AnimatePresence mode="popLayout" initial={false}>
          {feed.slice(-3).map((entry) => (
            <motion.div
              layout
              key={entry.id}
              className={entry.speaker === 'you' ? styles.youRow : styles.npcRow}
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -22, transition: { duration: 0.2 } }}
              transition={spring}
            >
              <SpeechBubble
                tail={entry.speaker === 'you' ? 'player' : 'npc'}
                testId={entry.speaker === 'you' ? 'player-bubble' : 'npc-bubble'}
              >
                {entry.move.action === 'bid' ? (
                  <span className={styles.bidLine}>
                    <BidChip
                      bid={entry.move.bid}
                      owner={entry.speaker === 'you' ? 'player' : 'npc'}
                    />
                    {entry.talk && <span>{entry.talk}</span>}
                  </span>
                ) : (
                  <>
                    {entry.talk && <span>{entry.talk}</span>}
                    <b className={styles.callShout}> Call!</b>
                  </>
                )}
              </SpeechBubble>
            </motion.div>
          ))}
          {phase === 'awaitingNpc' && !playerCalled && (
            <motion.div
              layout
              key="thinking"
              className={styles.npcRow}
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={spring}
            >
              <ThinkingBubble />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Outside AnimatePresence on purpose: an input surface must vanish
         * the instant the move is made — a lingering exit animation leaves a
         * second live composer in the DOM racing the next turn's. */}
        {phase === 'playerTurn' && view && (
          <motion.div
            layout
            key="composer"
            className={styles.youRow}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={spring}
          >
            <PlayerComposer
              currentBid={currentBid}
              startTotal={startTotal}
              currentTotal={currentTotal}
              onMove={submitPlayerMove}
            />
          </motion.div>
        )}
      </div>

      {/* Beats owned by the scene, not a speaker. */}
      {phase === 'npcIntro' && (
        <>
          {/* No bio here: it is derived from the NPC's hidden parameters and
           * would tip their play style. The autopsy unmasks them after. */}
          <div className={styles.introCard} data-testid="npc-intro">
            <h1>{npcName}</h1>
            <p>They stack their dice and size you up in silence.</p>
          </div>
          <StatusStrip onClick={rollDice} testId="roll-dice">
            Roll dice
          </StatusStrip>
        </>
      )}
      {activeReveal && (
        <StatusStrip placement="top" testId="reveal-outcome">
          {describeReveal(revealEntry(activeReveal))}
        </StatusStrip>
      )}
      {phase === 'awaitingNpc' && !activeReveal && (
        <StatusStrip testId="npc-thinking-strip">
          {playerCalled
            ? 'The hands come open…'
            : `${npcName} considers${currentBid ? ` your ${spokenBid(currentBid)}` : ''}…`}
        </StatusStrip>
      )}
    </>
  );

  return (
    <div
      // Scroll up (or swipe down from the top of the scene) unrolls the
      // table-talk history, like paging back up through the reference's log.
      onWheel={(e) => {
        if (!historyOpen && e.deltaY < -20) setHistoryOpen(true);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        const start = touchStart.current;
        const t = e.touches[0];
        if (historyOpen || !start || !t) return;
        const dy = t.clientY - start.y;
        const dx = Math.abs(t.clientX - start.x);
        if (start.y < window.innerHeight * 0.35 && dy > 60 && dy > dx * 2) {
          touchStart.current = null;
          setHistoryOpen(true);
        }
      }}
    >
      <TableScene
        hud={
          <TopBar
            perPlayer={perPlayer}
            playerCount={displayedDiceCounts?.[HUMAN_SEAT] ?? perPlayer}
            npcCount={displayedDiceCounts?.[NPC_SEAT] ?? perPlayer}
            onHistoryToggle={() => setHistoryOpen((open) => !open)}
            historyOpen={historyOpen}
          />
        }
        npc={<NpcFigure art={art} pose={npcPose} name={npcName} />}
        hand={
          <PlayerHand
            dice={displayedHand}
            revealed={activeReveal !== null}
            rolling={phase === 'dealing'}
            rollKey={view?.round_no ?? 0}
          />
        }
        bubbles={bubbles}
        overlay={
          <>
            {activeReveal && <NpcDiceReveal reveal={activeReveal} />}
            <HistorySheet
              open={historyOpen}
              entries={transcript}
              onClose={() => setHistoryOpen(false)}
            />
            {phase === 'playerTurn' && (
              <button
                type="button"
                className={styles.walkAway}
                onClick={walkAway}
                data-testid="walk-away"
              >
                walk away
              </button>
            )}
            <AnimatePresence>
              {error && (
                <motion.button
                  type="button"
                  className={styles.errorToast}
                  onClick={dismissError}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  data-testid="error-toast"
                >
                  {error}
                </motion.button>
              )}
            </AnimatePresence>
          </>
        }
      />
    </div>
  );
}
