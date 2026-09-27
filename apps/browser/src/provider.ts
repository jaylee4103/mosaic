import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'

// Mirrors apps/web/lib/ai/providers.ts's OpenRouter setup — same env var,
// same provider mechanism, kept independent so this service has no
// dependency on apps/web.
const DEFAULT_MODEL = 'openai/gpt-4o-mini'

export function resolveNavigatorModel(): LanguageModel {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw Object.assign(new Error('Browser navigation agent is not configured. Set OPENROUTER_API_KEY.'), { code: 'AGENT_UNAVAILABLE' })
  }
  const provider = createOpenAICompatible({ name: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', apiKey })
  return provider(process.env.NAVIGATOR_MODEL_ID ?? DEFAULT_MODEL)
}
