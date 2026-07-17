/**
 * Hand-translated contract of the OpenSwindle engine's Pydantic models
 * (openswindle/src/openswindle/models.py and api.py). Field names stay
 * snake_case to match the wire format exactly.
 */

export type Seat = 'a' | 'b';
export type Face = 1 | 2 | 3 | 4;

export interface Bid {
  quantity: number;
  face: Face;
}

export type Move = { action: 'bid'; bid: Bid } | { action: 'call' };

export type OpponentType = 'llm' | 'scripted' | 'human';

export interface MatchConfig {
  dice_per_player: number;
  opponent_type: OpponentType;
  npc_seed: string;
  channel_susceptibility: boolean;
}

export interface BidRecord {
  seat: Seat;
  bid: Bid;
  table_talk: string | null;
}

export interface RoundReveal {
  round_no: number;
  hands: Record<Seat, number[]>;
  salts: Record<Seat, string>;
  commitments: Record<Seat, string>;
  final_bid: Bid;
  caller: Seat;
  actual_count: number;
  bid_met: boolean;
  loser: Seat;
}

export type Phase = 'bidding' | 'finished';

export interface PublicMatchView {
  match_id: string;
  seat: Seat;
  phase: Phase;
  winner: Seat | null;
  round_no: number;
  turn: Seat;
  dice_counts: Record<Seat, number>;
  your_hand: number[];
  commitments: Record<Seat, string>;
  bid_history: BidRecord[];
  reveals: RoundReveal[];
}

export interface CreateMatchResponse {
  match_id: string;
  tokens: Record<Seat, string>;
  npc_name: string | null;
  npc_bio: string | null;
  view: PublicMatchView;
}

/** NPC move as reported by POST /moves; `bid` is the engine's "NxF" string form. */
export interface NPCEvent {
  action: 'bid' | 'call';
  bid: string | null;
  table_talk: string;
}

export interface MoveResponse {
  view: PublicMatchView;
  npc_events: NPCEvent[];
  reveals: RoundReveal[];
}

export interface NPCPublicProfile {
  name: string;
  bio: string;
}

export interface NPCParams {
  deception: number;
  skepticism: number;
  aggression: number;
  chattiness: number;
}

export interface NPCProfile {
  seed: string;
  name: string;
  bio: string;
  params: NPCParams;
}

export interface DecisionRecord {
  round_no: number;
  chosen_move: Move;
  optimal_move: Move;
  chosen_probability: number;
  optimal_probability: number;
  deviation_price: number;
  scratchpad: string;
  table_talk: string;
  susceptibility_on: boolean;
  human_table_talk_seen: string | null;
  fallback: boolean;
  reprompts: number;
  prompt_tokens: number | null;
  cached_tokens: number | null;
  completion_tokens: number | null;
}

export interface Autopsy {
  match_id: string;
  winner: Seat | null;
  npc_profile: NPCProfile;
  decisions: DecisionRecord[];
  total_deviation_price: number;
}

export const HUMAN_SEAT: Seat = 'a';
export const NPC_SEAT: Seat = 'b';

export function otherSeat(seat: Seat): Seat {
  return seat === 'a' ? 'b' : 'a';
}
