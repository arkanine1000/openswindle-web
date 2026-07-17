import { create } from 'zustand';
import { ApiError, abortMatch, createMatch, getMatch, submitMove } from '../api/client';
import type { Bid, MatchConfig, Move, PublicMatchView, RoundReveal, Seat } from '../api/types';
import { HUMAN_SEAT } from '../api/types';
import type { Step } from './choreography';
import { buildSteps } from './choreography';
import { PACING, sleep } from './pacing';
import type { TranscriptEntry } from './transcript';
import { moveEntry, narrationEntry, revealEntry } from './transcript';

export type ScenePhase =
  | 'splash'
  | 'npcIntro' // opponent sits down; "Roll the dice" CTA
  | 'dealing' // dice tumble and settle
  | 'playerTurn'
  | 'awaitingNpc' // move request in flight; thinking bubble
  | 'choreographing' // playing queued NPC events / reveals
  | 'result' // WIN!/DEFEAT! card
  | 'autopsy';

export type Outcome = 'win' | 'defeat' | 'abandoned';
export type NpcPose = 'seated' | 'accusing';

/** One utterance in the rolling conversation window. The newest entry holds
 * the bottom slot; older ones shift up and eventually roll out. */
export interface FeedEntry {
  id: number;
  speaker: 'you' | 'npc';
  talk: string;
  move: Move;
}

let feedId = 0;
function nextFeedId(): number {
  feedId += 1;
  return feedId;
}

const STORAGE_KEY = 'openswindle-match';

interface StoredMatch {
  matchId: string;
  token: string;
  npcName: string;
  npcBio: string;
  npcSeed: string;
  startTotal: number;
}

interface GameState {
  phase: ScenePhase;
  matchId: string | null;
  token: string | null;
  npcName: string;
  npcBio: string;
  /** Seed used for this match's NPC; drives portrait-variant selection. */
  npcSeed: string;
  /** Total dice at match start — the bid carousel's upper bound for the whole match. */
  startTotal: number;
  /** Latest authoritative view. Applied only between presentation beats so
   * the HUD can't leak an outcome before its reveal plays. */
  view: PublicMatchView | null;
  transcript: TranscriptEntry[];

  /* Presentation state, advanced step-by-step by the choreographer. */
  displayedHand: number[];
  displayedDiceCounts: Record<Seat, number> | null;
  currentBid: Bid | null;
  /** Current round's utterances, oldest first; cleared each round. */
  feed: FeedEntry[];
  activeReveal: RoundReveal | null;
  npcPose: NpcPose;
  outcome: Outcome | null;
  error: string | null;

  startMatch(config: Partial<MatchConfig>): Promise<void>;
  rollDice(): Promise<void>;
  submitPlayerMove(move: Move, talk: string | null): Promise<void>;
  walkAway(): Promise<void>;
  showAutopsy(): void;
  playAgain(): void;
  dismissError(): void;
  rehydrate(): Promise<boolean>;
}

/** Guards against steps from an abandoned match playing into a new one. */
let runId = 0;

function talkLinger(talk: string): number {
  return PACING.npcBubbleMs + talk.length * PACING.perCharMs;
}

export const useGameStore = create<GameState>((set, get) => {
  async function playSteps(steps: Step[], finalView: PublicMatchView): Promise<void> {
    const run = runId;
    const alive = () => runId === run;
    set({ phase: 'choreographing' });

    for (const step of steps) {
      if (!alive()) return;
      switch (step.type) {
        case 'npcMove': {
          const isCall = step.move.action === 'call';
          set((s) => ({
            feed: [
              ...s.feed,
              { id: nextFeedId(), speaker: 'npc', talk: step.talk, move: step.move },
            ],
            npcPose: isCall ? 'accusing' : s.npcPose,
            currentBid: step.move.action === 'bid' ? step.move.bid : s.currentBid,
            transcript: [
              ...s.transcript,
              moveEntry(finalView.round_no, 'npc', step.move, step.talk || null),
            ],
          }));
          await sleep(talkLinger(step.talk));
          break;
        }
        case 'reveal': {
          set((s) => {
            const counts = s.displayedDiceCounts ? { ...s.displayedDiceCounts } : null;
            if (counts) counts[step.reveal.loser] -= 1;
            return {
              activeReveal: step.reveal,
              npcPose: 'accusing',
              displayedDiceCounts: counts,
              transcript: [...s.transcript, revealEntry(step.reveal)],
            };
          });
          await sleep(PACING.revealMs);
          break;
        }
        case 'roundStart': {
          const opensText =
            step.opener === HUMAN_SEAT
              ? `Round ${step.roundNo} — you lost the last, so you open.`
              : `Round ${step.roundNo} — your opponent opens.`;
          set((s) => ({
            phase: 'dealing',
            activeReveal: null,
            npcPose: 'seated',
            feed: [],
            currentBid: null,
            displayedHand: step.yourHand,
            transcript: [...s.transcript, narrationEntry(step.roundNo, opensText)],
          }));
          await sleep(PACING.roundStartMs);
          if (alive()) set({ phase: 'choreographing' });
          break;
        }
        case 'matchEnd': {
          await sleep(PACING.matchEndPauseMs);
          if (!alive()) return;
          const outcome: Outcome =
            step.winner === null ? 'abandoned' : step.winner === HUMAN_SEAT ? 'win' : 'defeat';
          sessionStorage.removeItem(STORAGE_KEY);
          set({ outcome, phase: 'result', view: finalView });
          return;
        }
      }
    }

    if (!alive()) return;
    set({ view: finalView, phase: 'playerTurn' });
  }

  return {
    phase: 'splash',
    matchId: null,
    token: null,
    npcName: '',
    npcBio: '',
    npcSeed: '',
    startTotal: 0,
    view: null,
    transcript: [],
    displayedHand: [],
    displayedDiceCounts: null,
    currentBid: null,
    feed: [],
    activeReveal: null,
    npcPose: 'seated',
    outcome: null,
    error: null,

    async startMatch(config) {
      runId += 1;
      try {
        const res = await createMatch(config);
        const token = res.tokens[HUMAN_SEAT];
        const startTotal = Object.values(res.view.dice_counts).reduce((a, b) => a + b, 0);
        const npcName = res.npc_name ?? 'A stranger';
        const npcBio = res.npc_bio ?? '';
        const npcSeed = config.npc_seed ?? '4471';
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            matchId: res.match_id,
            token,
            npcName,
            npcBio,
            npcSeed,
            startTotal,
          } satisfies StoredMatch),
        );
        set({
          phase: 'npcIntro',
          matchId: res.match_id,
          token,
          npcName,
          npcBio,
          npcSeed,
          startTotal,
          view: res.view,
          // The bio stays out of the transcript too — it's derived from the
          // NPC's hidden parameters and would tip their play style.
          transcript: [
            narrationEntry(1, `${npcName} sits down across from you.`),
            narrationEntry(1, `${startTotal / 2} dice each. You take first bid.`),
          ],
          displayedHand: [],
          displayedDiceCounts: res.view.dice_counts,
          currentBid: null,
          feed: [],
          activeReveal: null,
          npcPose: 'seated',
          outcome: null,
          error: null,
        });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    async rollDice() {
      const { view } = get();
      if (!view) return;
      set({ phase: 'dealing', displayedHand: view.your_hand });
      await sleep(PACING.roundStartMs);
      set({ phase: 'playerTurn' });
    },

    async submitPlayerMove(move, talk) {
      const { matchId, token, view } = get();
      if (!matchId || !token || !view) return;
      const feedBefore = get().feed;
      set((s) => ({
        phase: 'awaitingNpc',
        // The player's utterance takes the newest slot; earlier bubbles
        // shift up in the rolling window.
        feed: [...s.feed, { id: nextFeedId(), speaker: 'you', talk: talk ?? '', move }],
        currentBid: move.action === 'bid' ? move.bid : s.currentBid,
        error: null,
      }));
      try {
        const res = await submitMove(matchId, token, move, talk);
        set((s) => ({
          transcript: [...s.transcript, moveEntry(view.round_no, 'you', move, talk)],
        }));
        await playSteps(buildSteps(move, res), res.view);
      } catch (err) {
        // Rejected moves leave server state untouched; hand the turn back
        // and retract the unspoken bubble.
        set({
          phase: 'playerTurn',
          feed: feedBefore,
          currentBid: view.bid_history.length
            ? (view.bid_history[view.bid_history.length - 1]?.bid ?? null)
            : null,
          error: err instanceof ApiError ? err.detail : 'Something went wrong. Try again.',
        });
      }
    },

    async walkAway() {
      const { matchId, token } = get();
      if (!matchId || !token) return;
      try {
        const res = await abortMatch(matchId, token);
        set((s) => ({
          transcript: [
            ...s.transcript,
            narrationEntry(res.view.round_no, 'You push back your chair and walk away.'),
          ],
        }));
        await playSteps(buildSteps(null, res), res.view);
      } catch (err) {
        set({ error: err instanceof ApiError ? err.detail : 'Could not leave the table.' });
      }
    },

    showAutopsy() {
      set({ phase: 'autopsy' });
    },

    playAgain() {
      runId += 1;
      sessionStorage.removeItem(STORAGE_KEY);
      set({
        phase: 'splash',
        matchId: null,
        token: null,
        npcName: '',
        npcBio: '',
        startTotal: 0,
        view: null,
        transcript: [],
        displayedHand: [],
        displayedDiceCounts: null,
        currentBid: null,
        feed: [],
        activeReveal: null,
        npcPose: 'seated',
        outcome: null,
        error: null,
      });
    },

    dismissError() {
      set({ error: null });
    },

    async rehydrate() {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      let stored: StoredMatch;
      try {
        stored = JSON.parse(raw) as StoredMatch;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return false;
      }
      try {
        const view = await getMatch(stored.matchId, stored.token);
        if (view.phase === 'finished' || view.turn !== HUMAN_SEAT) {
          sessionStorage.removeItem(STORAGE_KEY);
          return false;
        }
        const lastBid = view.bid_history[view.bid_history.length - 1];
        set({
          phase: 'playerTurn',
          matchId: stored.matchId,
          token: stored.token,
          npcName: stored.npcName,
          npcBio: stored.npcBio,
          npcSeed: stored.npcSeed,
          startTotal: stored.startTotal,
          view,
          transcript: [
            narrationEntry(view.round_no, `You return to the table. ${stored.npcName} waits.`),
            ...view.bid_history.map((b) =>
              moveEntry(
                view.round_no,
                b.seat === HUMAN_SEAT ? 'you' : 'npc',
                { action: 'bid', bid: b.bid },
                b.table_talk,
              ),
            ),
          ],
          displayedHand: view.your_hand,
          displayedDiceCounts: view.dice_counts,
          currentBid: lastBid?.bid ?? null,
          // Rebuild the conversation window from the round's bids so the
          // table doesn't come back mute.
          feed: view.bid_history.map((b) => ({
            id: nextFeedId(),
            speaker: (b.seat === HUMAN_SEAT ? 'you' : 'npc') as FeedEntry['speaker'],
            talk: b.table_talk ?? '',
            move: { action: 'bid', bid: b.bid } as Move,
          })),
          activeReveal: null,
          npcPose: 'seated',
          outcome: null,
          error: null,
        });
        return true;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return false;
      }
    },
  };
});
