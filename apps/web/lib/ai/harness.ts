import { generateText, stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from 'ai'

// Generic tool-calling agent loop. Deliberately knows nothing about
// shopping, carts, or products — an agent is just (model, tools, system
// prompt, messages) passed in by its caller. This is what makes tools and
// models independently swappable between agents: a future "styling agent"
// or "checkout agent" reuses this same loop with a different tool set, and
// any agent can swap providers (see providers.ts) without this file
// changing at all.
export type AgentTurnInput = {
  model: LanguageModel
  tools: ToolSet
  system: string
  messages: ModelMessage[]
  maxSteps?: number
}

export type AgentTurnResult = {
  assistantMessage: string
  steps: number
}

const DEFAULT_MAX_STEPS = 8

export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  const result = await generateText({
    model: input.model,
    system: input.system,
    messages: input.messages,
    tools: input.tools,
    stopWhen: stepCountIs(input.maxSteps ?? DEFAULT_MAX_STEPS),
  })

  return {
    assistantMessage: result.text,
    steps: result.steps.length,
  }
}
