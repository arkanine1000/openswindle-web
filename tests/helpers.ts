import type {
  Bid,
  Face,
  MoveResponse,
  NPCEvent,
  PublicMatchView,
  RoundReveal,
} from '../src/api/types';

export const bid = (quantity: number, face: Face): Bid => ({ quantity, face });

export function view(overrides: Partial<PublicMatchView> = {}): PublicMatchView {
  return {
    match_id: 'm1',
    seat: 'a',
    phase: 'bidding',
    winner: null,
    round_no: 1,
    turn: 'a',
    dice_counts: { a: 4, b: 4 },
    your_hand: [1, 2, 3, 4],
    commitments: { a: 'ca', b: 'cb' },
    bid_history: [],
    reveals: [],
    ...overrides,
  };
}

export function reveal(overrides: Partial<RoundReveal> = {}): RoundReveal {
  return {
    round_no: 1,
    hands: { a: [1, 2, 3, 4], b: [1, 1, 2, 4] },
    salts: { a: 'sa', b: 'sb' },
    commitments: { a: 'ca', b: 'cb' },
    final_bid: bid(3, 1),
    caller: 'a',
    actual_count: 3,
    bid_met: true,
    loser: 'a',
    ...overrides,
  };
}

export function npcBid(text: string, talk = ''): NPCEvent {
  return { action: 'bid', bid: text, table_talk: talk };
}

export function npcCall(talk = ''): NPCEvent {
  return { action: 'call', bid: null, table_talk: talk };
}

export function moveResponse(overrides: Partial<MoveResponse> = {}): MoveResponse {
  return { view: view(), npc_events: [], reveals: [], ...overrides };
}
