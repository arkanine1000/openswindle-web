/** The OpenRouter models selectable as the NPC opponent. Must mirror the
 * backend's allowlist exactly (openswindle/src/openswindle/models.py,
 * `LLMModel`) — the backend rejects anything outside it with a 422, so this
 * list can only ever narrow what a client is offered, never widen what the
 * server will accept.
 *
 * Difficulty is assigned from live benchmark win rate against a scripted
 * probe, not price — see openswindle/benchmarks/results.csv and the
 * scouting-report artifact for the numbers behind this grouping. */
export const LLM_MODELS = [
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-flash-0731',
  'moonshotai/kimi-k2.6',
  'z-ai/glm-5.2',
] as const;
export type LlmModel = (typeof LLM_MODELS)[number];

export type Difficulty = 'easy' | 'standard' | 'advanced';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'standard', 'advanced'];

export interface ModelInfo {
  /** Display name shown in the picker. */
  label: string;
  difficulty: Difficulty;
}

export const MODEL_META: Record<LlmModel, ModelInfo> = {
  'deepseek/deepseek-v4-flash': { label: 'DeepSeek V4 Flash', difficulty: 'easy' },
  'deepseek/deepseek-v4-flash-0731': {
    label: 'DeepSeek V4 Flash (0731 Preview)',
    difficulty: 'easy',
  },
  'moonshotai/kimi-k2.6': { label: 'Kimi K2.6', difficulty: 'standard' },
  'z-ai/glm-5.2': { label: 'GLM 5.2', difficulty: 'advanced' },
};

/** Models grouped by difficulty, in LLM_MODELS order within each group.
 * Drives the picker's <optgroup>s. */
export const MODELS_BY_DIFFICULTY: Record<Difficulty, LlmModel[]> = LLM_MODELS.reduce(
  (groups, id) => {
    groups[MODEL_META[id].difficulty].push(id);
    return groups;
  },
  { easy: [], standard: [], advanced: [] } as Record<Difficulty, LlmModel[]>,
);

// Provisional default — 0731 plays a looser, more bluff-prone game than
// stable at the same win rate (see the scouting report). Easy revert to
// 'deepseek/deepseek-v4-flash' if that doesn't hold up with more players.
export const DEFAULT_MODEL: LlmModel = 'deepseek/deepseek-v4-flash-0731';
