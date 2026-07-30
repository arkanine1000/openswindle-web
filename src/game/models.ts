/** The OpenRouter models selectable as the NPC opponent. Must mirror the
 * backend's allowlist exactly (openswindle/src/openswindle/models.py,
 * `LLMModel`) — the backend rejects anything outside it with a 422, so this
 * list can only ever narrow what a client is offered, never widen what the
 * server will accept. Cross-check pricing/slugs at openrouter.ai/models
 * before adding, removing, or reassigning a difficulty.
 *
 * Ordered ascending by OpenRouter output price per million tokens — a rough
 * proxy for reasoning depth — as of 2026-07. That price is never shown to
 * the player; only the difficulty grouping derived from it is. */
export const LLM_MODELS = [
  'poolside/laguna-xs-2.1',
  'deepseek/deepseek-v4-flash',
  'qwen/qwen3.5-flash-02-23',
  'z-ai/glm-5.2',
  'google/gemini-3.5-flash-lite',
  'moonshotai/kimi-k2.6',
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
  'poolside/laguna-xs-2.1': { label: 'Laguna XS 2.1', difficulty: 'easy' },
  'deepseek/deepseek-v4-flash': { label: 'DeepSeek V4 Flash', difficulty: 'easy' },
  'qwen/qwen3.5-flash-02-23': { label: 'Qwen 3.5 Flash', difficulty: 'standard' },
  'z-ai/glm-5.2': { label: 'GLM 5.2', difficulty: 'standard' },
  'google/gemini-3.5-flash-lite': { label: 'Gemini 3.5 Flash-Lite', difficulty: 'advanced' },
  'moonshotai/kimi-k2.6': { label: 'Kimi K2.6', difficulty: 'advanced' },
};

/** Models grouped by difficulty, each group already in ascending price order
 * since LLM_MODELS is. Drives the picker's <optgroup>s. */
export const MODELS_BY_DIFFICULTY: Record<Difficulty, LlmModel[]> = LLM_MODELS.reduce(
  (groups, id) => {
    groups[MODEL_META[id].difficulty].push(id);
    return groups;
  },
  { easy: [], standard: [], advanced: [] } as Record<Difficulty, LlmModel[]>,
);

export const DEFAULT_MODEL: LlmModel = 'deepseek/deepseek-v4-flash';
