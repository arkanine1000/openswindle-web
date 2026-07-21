import type {
  Autopsy,
  CreateMatchResponse,
  JoinMatchResponse,
  MatchConfig,
  Move,
  MoveResponse,
  NPCPublicProfile,
  PublicMatchView,
} from './types';

const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'The table has gone quiet — could not reach the game server.');
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

function authed(token: string): HeadersInit {
  return { 'X-Player-Token': token };
}

export function createMatch(config: Partial<MatchConfig>): Promise<CreateMatchResponse> {
  return request('/matches', { method: 'POST', body: JSON.stringify({ config }) });
}

export function getMatch(matchId: string, token: string): Promise<PublicMatchView> {
  return request(`/matches/${matchId}`, { headers: authed(token) });
}

/** Claim seat B of a human-vs-human match (only the creator held a token before). */
export function joinMatch(matchId: string): Promise<JoinMatchResponse> {
  return request(`/matches/${matchId}/join`, { method: 'POST' });
}

export function submitMove(
  matchId: string,
  token: string,
  move: Move,
  tableTalk: string | null,
): Promise<MoveResponse> {
  return request(`/matches/${matchId}/moves`, {
    method: 'POST',
    headers: authed(token),
    body: JSON.stringify({ move, table_talk: tableTalk }),
  });
}

export function abortMatch(matchId: string, token: string): Promise<MoveResponse> {
  return request(`/matches/${matchId}/abort`, { method: 'POST', headers: authed(token) });
}

export function getNpcProfile(matchId: string): Promise<NPCPublicProfile> {
  return request(`/matches/${matchId}/npc/profile`);
}

export function getAutopsy(matchId: string): Promise<Autopsy> {
  return request(`/matches/${matchId}/autopsy`);
}
