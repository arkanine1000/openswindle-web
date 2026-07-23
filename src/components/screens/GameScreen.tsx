import { HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { otherSeat } from '../../api/types';
import { npcArtForSeed } from '../../assets/manifest';
import { useGameStore, type FeedEntry } from '../../game/store';
import { describeReveal, revealEntry } from '../../game/transcript';
import { BidChip } from '../bubbles/BidChip';
import { PlayerComposer } from '../bubbles/PlayerComposer';
import { SpeechBubble } from '../bubbles/SpeechBubble';
import { ThinkingBubble } from '../bubbles/ThinkingBubble';
import { HistorySheet } from '../hud/HistorySheet';
import { RulesModal } from '../hud/RulesModal';
import { TopBar } from '../hud/TopBar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { NpcDiceReveal } from '../scene/NpcDiceReveal';
import { NpcFigure } from '../scene/NpcFigure';
import { PlayerHand } from '../scene/PlayerHand';
import { StatusStrip } from '../scene/StatusStrip';
import { TableScene } from '../scene/TableScene';
import styles from './GameScreen.module.css';

/** The auto-talk toggle is a lasting preference, unlike the per-tab match. */
const AUTO_TALK_KEY = 'openswindle-auto-talk';

/** Mirrors the 768px CSS breakpoint. Desktop keeps the rolling
 * three-bubble window; mobile pares down to one opponent utterance and a
 * repositioned composer, so the two layouts render different trees. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export function GameScreen() {
  const phase = useGameStore((s) => s.phase);
  const view = useGameStore((s) => s.view);
  const mySeat = useGameStore((s) => s.mySeat);
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

  const isDesktop = useIsDesktop();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  // Lives here, not in the composer, so the choice survives across turns.
  const [autoTalk, setAutoTalk] = useState(() => localStorage.getItem(AUTO_TALK_KEY) === 'true');
  const toggleAutoTalk = () => {
    const next = !autoTalk;
    localStorage.setItem(AUTO_TALK_KEY, String(next));
    setAutoTalk(next);
  };
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const opponentSeat = otherSeat(mySeat);
  const perPlayer = startTotal / 2;
  const currentTotal = displayedDiceCounts
    ? displayedDiceCounts[mySeat] + displayedDiceCounts[opponentSeat]
    : 0;
  const art = npcArtForSeed(npcSeed);
  // After a call there is nothing to "think" about — the hands come open.
  const lastUtterance = feed[feed.length - 1];
  const playerCalled = lastUtterance?.speaker === 'you' && lastUtterance.move.action === 'call';

  const spring = { type: 'spring', stiffness: 380, damping: 28 } as const;

  const utterance = (entry: FeedEntry) =>
    entry.move.action === 'bid' ? (
      <span className={styles.bidLine}>
        <BidChip bid={entry.move.bid} owner={entry.speaker === 'you' ? 'player' : 'npc'} />
        {entry.talk && <span>{entry.talk}</span>}
      </span>
    ) : (
      <>
        {entry.talk && <span>{entry.talk}</span>}
        <b className={styles.callShout}> Call!</b>
      </>
    );

  const composer = phase === 'playerTurn' && view && (
    <PlayerComposer
      currentBid={currentBid}
      startTotal={startTotal}
      currentTotal={currentTotal}
      autoTalk={autoTalk}
      onToggleAutoTalk={toggleAutoTalk}
      onMove={submitPlayerMove}
    />
  );

  /* Desktop: the rolling conversation window — newest utterance holds the
   * bottom slot; each arrival shifts the others up (motion layout
   * animation) and the oldest dissolve under the HUD. The composer and the
   * thinking placeholder occupy that same newest slot while active. */
  const desktopConversation = (
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
              {utterance(entry)}
            </SpeechBubble>
          </motion.div>
        ))}
        {phase === 'awaitingOpponent' && !playerCalled && (
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
      {composer && (
        <motion.div
          layout
          key="composer"
          className={styles.youRow}
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
        >
          {composer}
        </motion.div>
      )}
    </div>
  );

  /* Mobile: vertical space is scarce, so only two surfaces exist — the
   * opponent's current utterance (or their thinking), seated left of the
   * figure's face, and the composer dropped toward the player's hand. The
   * full exchange lives in the history drawer, a swipe away. */
  const lastNpc = [...feed].reverse().find((entry) => entry.speaker === 'npc');
  const mobileBubbles = (
    <>
      <div className={styles.npcSlot}>
        <AnimatePresence mode="popLayout" initial={false}>
          {phase === 'awaitingOpponent' && !playerCalled ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={spring}
            >
              <ThinkingBubble tail="up" />
            </motion.div>
          ) : lastNpc ? (
            <motion.div
              key={lastNpc.id}
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={spring}
            >
              <SpeechBubble tail="up" testId="npc-bubble">
                {utterance(lastNpc)}
              </SpeechBubble>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {/* Same no-exit-animation rule as the desktop composer. */}
      {composer && (
        <motion.div
          key="composer"
          className={styles.composerSlot}
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
        >
          {composer}
        </motion.div>
      )}
    </>
  );

  const bubbles = (
    <>
      {isDesktop ? desktopConversation : mobileBubbles}

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
          {describeReveal(revealEntry(activeReveal, mySeat))}
        </StatusStrip>
      )}
      {/* Only the call-resolution beat gets a strip — while the NPC weighs
       * a bid, the thinking bubble already says so. */}
      {phase === 'awaitingOpponent' && !activeReveal && playerCalled && (
        <StatusStrip testId="npc-thinking-strip">The hands come open…</StatusStrip>
      )}
    </>
  );

  return (
    <div
      // Scroll up (desktop) or swipe down from anywhere (touch) pulls down
      // the table-talk history, like paging back through the reference's
      // log. The dy > dx guard keeps carousel drags from opening it.
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
        if (dy > 60 && dy > dx * 2) {
          touchStart.current = null;
          setHistoryOpen(true);
        }
      }}
    >
      <TableScene
        hud={
          <TopBar
            perPlayer={perPlayer}
            playerCount={displayedDiceCounts?.[mySeat] ?? perPlayer}
            npcCount={displayedDiceCounts?.[opponentSeat] ?? perPlayer}
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
            {/* Mirrors the surrender flag, under the opponent's pips: a way to
             * learn the rules without leaving the table. */}
            <button
              type="button"
              className={styles.help}
              onClick={() => setRulesOpen(true)}
              aria-label="How to play"
              title="How to play"
              data-testid="help"
            >
              <HelpCircle size="1.15em" aria-hidden />
            </button>
            <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
            {/* A forfeit is irreversible; guard it behind a quick yes/no. */}
            <Modal
              open={forfeitOpen}
              onClose={() => setForfeitOpen(false)}
              title="Walk away?"
              testId="forfeit-modal"
            >
              <div className={styles.forfeitActions}>
                <Button
                  variant="secondary"
                  onClick={() => setForfeitOpen(false)}
                  data-testid="confirm-cancel"
                >
                  No
                </Button>
                <Button
                  onClick={() => {
                    setForfeitOpen(false);
                    void walkAway();
                  }}
                  data-testid="confirm-accept"
                >
                  Yes
                </Button>
              </div>
            </Modal>
            {phase === 'playerTurn' && (
              <button
                type="button"
                className={styles.walkAway}
                onClick={() => setForfeitOpen(true)}
                aria-label="Walk away from the table"
                title="Walk away"
                data-testid="walk-away"
              >
                {/* A struck flag: forfeit, in the one shape that needs no
                 * label. Sized in em so it tracks the chip. */}
                <svg viewBox="0 0 20 20" width="1.1em" height="1.1em" aria-hidden>
                  <path
                    d="M5.6 3.2v13.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path d="M5.6 4.2h9.2l-2.5 3.1 2.5 3.1H5.6z" fill="currentColor" />
                </svg>
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
