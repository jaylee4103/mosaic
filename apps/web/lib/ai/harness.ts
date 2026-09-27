import { generateText, streamText, stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from 'ai'

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
  const toolNames = Object.keys(input.tools)
  console.log(
    `[harness] starting turn: model=${modelLabel(input.model)} tools=[${toolNames.join(', ')}] messages=${input.messages.length}`,
  )

  const result = await generateText({
    model: input.model,
    system: input.system,
    messages: input.messages,
    tools: input.tools,
    stopWhen: stepCountIs(input.maxSteps ?? DEFAULT_MAX_STEPS),
  })

  for (const [i, step] of result.steps.entries()) {
    const calls = step.toolCalls.map((c) => `${c.toolName}(${JSON.stringify(c.input)})`)
    const results = step.toolResults.map((r) => JSON.stringify(r.output))
    if (calls.length > 0) console.log(`[harness] step ${i + 1}: calls=[${calls.join(', ')}] results=[${results.join(', ')}]`)
    else console.log(`[harness] step ${i + 1}: text response, no tool calls`)
  }
  console.log(`[harness] finished turn: ${result.steps.length} step(s), finishReason=${result.finishReason}`)

  return {
    assistantMessage: result.text,
    steps: result.steps.length,
  }
}

function modelLabel(model: LanguageModel): string {
  return typeof model === 'string' ? model : `${model.provider}/${model.modelId}`
}

// Streamed events a caller (the chat route) forwards to the client in real
// time. 'tool-call' fires on 'tool-input-start' (the earliest signal a tool
// is running, before its arguments finish streaming) — that's what drives a
// UI's "searching…" indicator. 'done' carries the same result shape
// runAgentTurn returns, folded into the stream instead of a generator return
// value so a consumer can just handle every event the same way.
export type AgentStreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolName: string }
  | { type: 'done'; assistantMessage: string; steps: number }

export async function* runAgentTurnStream(input: AgentTurnInput): AsyncGenerator<AgentStreamEvent> {
  const toolNames = Object.keys(input.tools)
  console.log(
    `[harness] starting stream turn: model=${modelLabel(input.model)} tools=[${toolNames.join(', ')}] messages=${input.messages.length}`,
  )

  const result = streamText({
    model: input.model,
    system: input.system,
    messages: input.messages,
    tools: input.tools,
    stopWhen: stepCountIs(input.maxSteps ?? DEFAULT_MAX_STEPS),
  })

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') yield { type: 'text-delta', text: part.text }
    else if (part.type === 'tool-input-start') yield { type: 'tool-call', toolName: part.toolName }
  }

  const [assistantMessage, steps] = await Promise.all([result.text, result.steps])
  console.log(`[harness] finished stream turn: ${steps.length} step(s)`)
  yield { type: 'done', assistantMessage, steps: steps.length }
}
