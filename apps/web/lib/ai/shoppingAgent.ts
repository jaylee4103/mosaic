import type { ModelMessage } from 'ai'
import { getCart } from '@/lib/server/cart'
import { getVibeProfile } from '@/lib/server/vibe-profile'
import { runAgentTurn } from './harness'
import { resolveAgentModel, type AgentModelConfig } from './providers'
import { createShoppingTools } from './tools/shoppingTools'
import { performSearch } from '@/lib/server/searchOrchestrator'
import { getSupabaseAdmin } from '@/lib/server/supabase'

// The concrete "shopping agent" the root README describes — composes the
// generic harness (harness.ts) with the shopping tool set (tools/) and a
// system prompt. This is the one thing here that's shopping-specific;
// everything it depends on is swappable independently.
const SYSTEM_PROMPT = `You are Mosaic's shopping agent. You help the user build a cart of products that match their board's aesthetic (its "vibe profile") and their budget.

Rules:
- You decide *what* the cart should contain. The cart engine (via your tools) decides *whether and how* — trust its results, don't assume an action succeeded just because you called it.
- When the user asks you to shop for or find products, search the catalog, choose the best matching available product for each requested item, and add it to the cart in this turn. Do not ask the user to pick from search results or stop after listing options.
- If the requested item is already in the cart, do not add a duplicate. Explain what is already there or choose another requested item.
- Prefer the board's vibe profile when choosing what to search for, but follow explicit user requests over the vibe profile when they conflict.
- Locked items must not be removed or replaced — if a removal fails because the item is locked, tell the user instead of retrying.
- When the user wants to replace something already in the cart ("swap this out", "show me something else"), use swap_item first — it reuses close candidates from the original search instead of a fresh one. Only fall back to search_products + replace_item if swap_item reports no alternatives left.
- Respect the budget if one is set. If you can't find something that fits, say so rather than adding something over budget.
- If nothing in the catalog is a good match, say so rather than adding a weak match just to have added something.
- Use browse_webpage to navigate to product pages (from search_products results) when you need to check details, reviews, availability, or descriptions that aren't in the search snippet. Use browse_summary for a quicker overview with just the title and price.
- Keep your final reply short and concrete: what changed and why.`

export type ShoppingAgentTurnInput = {
  guestId: string
  boardId: string
  userMessage: string
  conversationHistory?: ModelMessage[]
  model?: AgentModelConfig
}

export type ShoppingAgentTurnResult = {
  assistantMessage: string
  cart: Awaited<ReturnType<typeof getCart>>
  steps: number
}

export async function runShoppingAgentTurn(input: ShoppingAgentTurnInput): Promise<ShoppingAgentTurnResult> {
  const { guestId, boardId, userMessage, conversationHistory = [], model } = input
  console.log(`[shopping-agent] turn start: boardId=${boardId} message=${JSON.stringify(userMessage)}`)

  const db = getSupabaseAdmin()

  const [vibeProfile, cart] = await Promise.all([
    getVibeProfile(guestId, boardId).catch(() => null),
    getCart(guestId, boardId),
  ])

  // Proactively search the internet based on vibe terms
  // This populates the Postgres cache before the agent tool loop begins
  if (vibeProfile) {
    try {
      await performSearch(vibeProfile, userMessage, guestId, db)
    } catch (err) {
      console.error('[shopping-agent] Internet search failed, continuing with cached/local results:', err)
    }
  }

  const vibePhrase = (vibeProfile?.profile as { phrase?: unknown } | undefined)?.phrase ?? null
  console.log(
    `[shopping-agent] context loaded: vibePhrase=${JSON.stringify(vibePhrase)} cartItems=${cart.items.length} budgetCents=${cart.budgetCents}`,
  )

  const contextMessage: ModelMessage = {
    role: 'user',
    content: [
      'Current board/cart context (read-only, for your reasoning — not something the user typed):',
      JSON.stringify({ vibeProfile: vibeProfile?.profile ?? null, cart }, null, 2),
    ].join('\n'),
  }

  const messages: ModelMessage[] = [
    contextMessage,
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  const tools = createShoppingTools(guestId, boardId)
  const result = await runAgentTurn({
    model: resolveAgentModel(model),
    tools,
    system: SYSTEM_PROMPT,
    messages,
  })

  const updatedCart = await getCart(guestId, boardId)
  console.log(
    `[shopping-agent] turn done: steps=${result.steps} finalCartItems=${updatedCart.items.length} reply=${JSON.stringify(result.assistantMessage)}`,
  )
  return { assistantMessage: result.assistantMessage, cart: updatedCart, steps: result.steps }
}
