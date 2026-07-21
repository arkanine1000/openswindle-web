import { create } from 'zustand';
import {
  ApiError,
  abortMatch,
  createMatch,
  getMatch,
  joinMatch as apiJoinMatch,
  submitMove,
} from '../api/client';
import type { Bid, MatchConfig, Move, PublicMatchView, RoundReveal, Seat } from '../api/types';
import { otherSeat } from '../api/types';
import type { Step } from './choreography';
import { buildRemoteSteps, buildSteps } from './choreography';
import { PACING, sleep } from './pacing';
import type { TranscriptEntry } from './transcript';
import { moveEntry, narrationEntry, revealEntry } from './transcript';

export type ScenePhase =
  | 'splash'
  | 'waiting' // human match: awaiting the opponent to join, or to move
  | 'npcIntro' // opponent sits down; "Roll the dice" CTA
  | 'dealing' // dice tumble and settle
  | 'playerTurn'
  | 'awaitingOpponent' // opponent's move is pending (NPC request in flight, or a human's turn)
  | 'choreographing' // playing queued opponent events / reveals
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
  mySeat: Seat;
  isHuman: boolean;
  npcName: string;
  npcBio: string;
  npcSeed: string;
  startTotal: number;
}

interface GameState {
  phase: ScenePhase;
  matchId: string | null;
  token: string | null;
  /** Which seat this client plays. Seat 'a' creates; seat 'b' joins by invite. */
  mySeat: Seat;
  /** True for invite matches (opponent is another person, reached by polling). */
  isHuman: boolean;
  /** Human match only: whether seat B has joined yet (drives the waiting screen). */
  opponentPresent: boolean;
  npcName: string;
  npcBio: string;
  /** Seed used for this match's NPC; drives portrait-variant selection. */
  npcSeed: string;
  /** Total dice at match start — the bid carousel's upper bound for the whole match. */
  startTotal: number;
  /** Latest authoritative view. Applied only between presentation beats so
   * the HUD can't leak an outcome before its reveal plays. For human matches
   * it also doubles as the baseline the poll loop diffs against. */
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
  startHumanMatch(config: Partial<MatchConfig>): Promise<void>;
  joinMatch(matchId: string): Promise<void>;
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

/** Poll loop shared by every human match: it wakes the waiting seat to fetch
 * the authoritative view and diff the opponent's move into presentation steps. */
const POLL_MS = 1600;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollDesired = false;
let pollInFlight = false;

function talkLinger(talk: string): number {
  return PACING.npcBubbleMs + talk.length * PACING.perCharMs;
}

/** The generic label for a human opponent — no bio, no seed-driven persona. */
const HUMAN_OPPONENT_NAME = 'Your challenger';

export const useGameStore = create<GameState>((set, get) => {
  function clearPollInterval(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function ensurePollInterval(): void {
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (pollTimer === null && !hidden) {
      pollTimer = setInterval(() => void pollTick(), POLL_MS);
    }
  }

  function startPolling(): void {
    pollDesired = true;
    ensurePollInterval();
  }

  function stopPolling(): void {
    pollDesired = false;
    clearPollInterval();
  }

  // Pause polling while the tab is hidden (browsers throttle it anyway); resume
  // on return. Registered once, when the store is created.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearPollInterval();
      else if (pollDesired) ensurePollInterval();
    });
  }

  async function playSteps(steps: Step[], finalView: PublicMatchView): Promise<void> {
    const run = runId;
    const alive = () => runId === run;
    const mySeat = get().mySeat;
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
              transcript: [...s.transcript, revealEntry(step.reveal, mySeat)],
            };
          });
          await sleep(PACING.revealMs);
          break;
        }
        case 'roundStart': {
          const opensText =
            step.opener === mySeat
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
            step.winner === null ? 'abandoned' : step.winner === mySeat ? 'win' : 'defeat';
          stopPolling();
          sessionStorage.removeItem(STORAGE_KEY);
          set({ outcome, phase: 'result', view: finalView });
          return;
        }
      }
    }

    if (!alive()) return;
    // Land on the right waiting state: my move, or the opponent's. For NPC
    // matches the NPC has already replied, so it is always the player's turn.
    const nextPhase: ScenePhase = finalView.turn === mySeat ? 'playerTurn' : 'awaitingOpponent';
    set({ view: finalView, phase: nextPhase });
    if (nextPhase === 'awaitingOpponent' && get().isHuman) startPolling();
    else stopPolling();
  }

  /** Deal into an invite match once both seats are present, then hand the turn
   * to whoever opens (me → play; the opponent → wait and poll). */
  async function beginHumanPlay(view: PublicMatchView): Promise<void> {
    const run = runId;
    const mySeat = get().mySeat;
    set({
      phase: 'dealing',
      view,
      opponentPresent: true,
      displayedHand: view.your_hand,
      displayedDiceCounts: view.dice_counts,
      feed: [],
      currentBid: null,
      activeReveal: null,
      npcPose: 'seated',
    });
    await sleep(PACING.roundStartMs);
    if (runId !== run) return;
    if (view.turn === mySeat) {
      stopPolling();
      set({ phase: 'playerTurn' });
    } else {
      set({ phase: 'awaitingOpponent' });
      startPolling();
    }
  }

  async function pollTick(): Promise<void> {
    if (pollInFlight) return;
    const { matchId, token, isHuman, phase } = get();
    if (!matchId || !token || !isHuman) return;
    if (phase !== 'waiting' && phase !== 'awaitingOpponent') {
      stopPolling();
      return;
    }
    pollInFlight = true;
    try {
      const newView = await getMatch(matchId, token);
      const state = get();
      // Bail if the match changed, or we left a pollable phase, underneath us.
      if (
        state.matchId !== matchId ||
        (state.phase !== 'waiting' && state.phase !== 'awaitingOpponent')
      ) {
        return;
      }

      if (state.phase === 'waiting') {
        if (newView.opponent_present) {
          await beginHumanPlay(newView);
        } else {
          set({ view: newView, opponentPresent: false });
        }
        return;
      }

      // awaitingOpponent: diff the fresh view against the last-applied one.
      const prev = state.view;
      if (!prev) return;
      const advanced =
        newView.bid_history.length !== prev.bid_history.length ||
        newView.reveals.length !== prev.reveals.length ||
        newView.round_no !== prev.round_no ||
        newView.phase !== prev.phase;
      if (!advanced) return;
      const steps = buildRemoteSteps(prev, newView, state.mySeat);
      if (steps.length === 0) {
        set({ view: newView });
        return;
      }
      await playSteps(steps, newView);
    } catch {
      // Transient poll failure: leave state as-is; the next tick re-syncs.
    } finally {
      pollInFlight = false;
    }
  }

  return {
    phase: 'splash',
    matchId: null,
    token: null,
    mySeat: 'a',
    isHuman: false,
    opponentPresent: true,
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
      stopPolling();
      try {
        const res = await createMatch(config);
        const token = res.tokens.a;
        const startTotal = Object.values(res.view.dice_counts).reduce((a, b) => a + b, 0);
        const npcName = res.npc_name ?? 'A stranger';
        const npcBio = res.npc_bio ?? '';
        const npcSeed = config.npc_seed ?? '4471';
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            matchId: res.match_id,
            token,
            mySeat: 'a',
            isHuman: false,
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
          mySeat: 'a',
          isHuman: false,
          opponentPresent: true,
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

    async startHumanMatch(config) {
      runId += 1;
      stopPolling();
      try {
        const res = await createMatch({ ...config, opponent_type: 'human' });
        const token = res.tokens.a;
        const startTotal = Object.values(res.view.dice_counts).reduce((a, b) => a + b, 0);
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            matchId: res.match_id,
            token,
            mySeat: 'a',
            isHuman: true,
            npcName: HUMAN_OPPONENT_NAME,
            npcBio: '',
            npcSeed: '',
            startTotal,
          } satisfies StoredMatch),
        );
        set({
          phase: 'waiting',
          matchId: res.match_id,
          token,
          mySeat: 'a',
          isHuman: true,
          opponentPresent: false,
          npcName: HUMAN_OPPONENT_NAME,
          npcBio: '',
          npcSeed: '',
          startTotal,
          view: res.view,
          transcript: [narrationEntry(1, 'Send the invite link and wait for a challenger.')],
          displayedHand: [],
          displayedDiceCounts: res.view.dice_counts,
          currentBid: null,
          feed: [],
          activeReveal: null,
          npcPose: 'seated',
          outcome: null,
          error: null,
        });
        startPolling();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    async joinMatch(matchId) {
      runId += 1;
      stopPolling();
      try {
        const res = await apiJoinMatch(matchId);
        const view = res.view;
        const startTotal = Object.values(view.dice_counts).reduce((a, b) => a + b, 0);
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            matchId: res.match_id,
            token: res.token,
            mySeat: res.seat,
            isHuman: true,
            npcName: HUMAN_OPPONENT_NAME,
            npcBio: '',
            npcSeed: '',
            startTotal,
          } satisfies StoredMatch),
        );
        set({
          matchId: res.match_id,
          token: res.token,
          mySeat: res.seat,
          isHuman: true,
          opponentPresent: true,
          npcName: HUMAN_OPPONENT_NAME,
          npcBio: '',
          npcSeed: '',
          startTotal,
          view,
          transcript: [narrationEntry(1, 'You take the empty seat across the table.')],
          displayedHand: [],
          displayedDiceCounts: view.dice_counts,
          currentBid: null,
          feed: [],
          activeReveal: null,
          npcPose: 'seated',
          outcome: null,
          error: null,
        });
        await beginHumanPlay(view);
      } catch (err) {
        set({ error: err instanceof ApiError ? err.detail : 'Could not join that match.' });
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
        phase: 'awaitingOpponent',
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
        stopPolling();
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
      stopPolling();
      sessionStorage.removeItem(STORAGE_KEY);
      set({
        phase: 'splash',
        matchId: null,
        token: null,
        mySeat: 'a',
        isHuman: false,
        opponentPresent: true,
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
        // A finished match can't be resumed. Neither can an NPC match caught
        // mid-reply (the NPC's turn can't be re-driven); a human match paused
        // on the opponent's turn resumes into the poll loop instead.
        if (view.phase === 'finished') {
          sessionStorage.removeItem(STORAGE_KEY);
          return false;
        }
        if (!stored.isHuman && view.turn !== stored.mySeat) {
          sessionStorage.removeItem(STORAGE_KEY);
          return false;
        }
        const mySeat = stored.mySeat;
        const lastBid = view.bid_history[view.bid_history.length - 1];
        const opponentAbsent = stored.isHuman && !view.opponent_present;
        const phase: ScenePhase = opponentAbsent
          ? 'waiting'
          : view.turn === mySeat
            ? 'playerTurn'
            : 'awaitingOpponent';
        set({
          phase,
          matchId: stored.matchId,
          token: stored.token,
          mySeat,
          isHuman: stored.isHuman,
          opponentPresent: !opponentAbsent,
          npcName: stored.npcName,
          npcBio: stored.npcBio,
          npcSeed: stored.npcSeed,
          startTotal: stored.startTotal,
          view,
          transcript: [
            narrationEntry(
              view.round_no,
              stored.isHuman
                ? 'You return to the table. Your challenger waits.'
                : `You return to the table. ${stored.npcName} waits.`,
            ),
            ...view.bid_history.map((b) =>
              moveEntry(
                view.round_no,
                b.seat === mySeat ? 'you' : 'npc',
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
            speaker: (b.seat === mySeat ? 'you' : 'npc') as FeedEntry['speaker'],
            talk: b.table_talk ?? '',
            move: { action: 'bid', bid: b.bid } as Move,
          })),
          activeReveal: null,
          npcPose: 'seated',
          outcome: null,
          error: null,
        });
        if (phase === 'waiting' || phase === 'awaitingOpponent') startPolling();
        return true;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return false;
      }
    },
  };
});

/** Convenience selector: the seat across the table from this client. */
export function opponentSeatOf(mySeat: Seat): Seat {
  return otherSeat(mySeat);
}
