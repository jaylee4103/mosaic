import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'

// Model provider is swappable independently of the agent harness and its
// tools (see harness.ts) — the harness only ever receives a LanguageModel,
// never knows which provider produced it. Temp: OpenRouter, since Meta's
// Muse Spark needs credits we don't have on that account yet (see
// .spec/shopping-agent-system.md). Swapping to Muse later is a provider
// config change here, not a harness/tool rewrite — both OpenRouter and
// Meta's direct Model API are OpenAI-Chat-Completions-compatible, so the
// same createOpenAICompatible mechanism covers both.
export type AgentProvider = 'openrouter' | 'meta'

const DEFAULT_PROVIDER: AgentProvider = 'openrouter'

// Placeholder default — override with AGENT_MODEL_ID once we've picked a
// model deliberately (cost/latency/tool-calling-quality tradeoff), this is
// just "known to work" for standing up the harness.
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'
const DEFAULT_META_MODEL = 'muse-spark-1.3'

function openrouterModel(modelId: string): LanguageModel {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('Shopping assistant is not configured. Set OPENROUTER_API_KEY on the server.'), { code: 'AGENT_UNAVAILABLE' })
  const provider = createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })
  return provider(modelId)
}

function metaModel(modelId: string): LanguageModel {
  const apiKey = process.env.META_MODEL_API_KEY
  if (!apiKey) throw Object.assign(new Error('Shopping assistant is not configured. Set META_MODEL_API_KEY on the server.'), { code: 'AGENT_UNAVAILABLE' })
  const provider = createOpenAICompatible({
    name: 'meta',
    baseURL: 'https://api.meta.ai/v1',
    apiKey,
  })
  return provider(modelId)
}

export type AgentModelConfig = {
  provider?: AgentProvider
  modelId?: string
}

/** Resolve which LanguageModel the harness should call, from explicit config
 * falling back to env vars falling back to the temp OpenRouter default. */
export function resolveAgentModel(config: AgentModelConfig = {}): LanguageModel {
  const provider = config.provider ?? (process.env.AGENT_PROVIDER as AgentProvider | undefined) ?? DEFAULT_PROVIDER

  switch (provider) {
    case 'openrouter':
      return openrouterModel(config.modelId ?? process.env.AGENT_MODEL_ID ?? DEFAULT_OPENROUTER_MODEL)
    case 'meta':
      return metaModel(config.modelId ?? process.env.AGENT_MODEL_ID ?? DEFAULT_META_MODEL)
    default:
      throw new Error(`Unknown agent provider: ${provider}`)
  }
}
