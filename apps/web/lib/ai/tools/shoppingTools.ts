import type { SupabaseClient } from '@supabase/supabase-js'
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { applyCartActions, type CartAction } from '@/lib/server/cart-actions'
import { searchProducts } from '@/lib/server/products'
import { dropAlternates, popNextAlternate, storeAlternates } from '@/lib/server/agent-alternates'
import { getSupabaseAdmin } from '@/lib/server/supabase'

// Cap on how many search results we treat as "close enough to the vibe to
// keep as fallback candidates" — the top pick gets added, the rest are
// stashed (see agent-alternates.ts) for a later swap_item call instead of
// re-searching. Not a hard product-ranking decision (products.ts owns
// ranking) — just how many of its results this layer holds onto.
const CANDIDATE_POOL_SIZE = 4

// One tool set implementation of the generic AgentTurnInput['tools'] shape
// the harness expects (see harness.ts) — swappable for a different tool set
// entirely (a future agent doesn't have to touch carts at all) without the
// harness changing. Built by a factory, not exported as static tools,
// because each tool needs a guestId/boardId bound into its closure — a
// fresh instance per board/guest, same shape every time.
//
// Cart actions execute immediately, one per tool call (via applyCartActions
// with a single-action batch), rather than accumulating and batching at
// end-of-turn as originally sketched in .spec/shopping-agent-system.md —
// the model needs to see whether e.g. an ADD actually succeeded (product
// not found, etc.) so it can react within the same turn, not just after.
export function createShoppingTools(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): ToolSet {
  async function runAction(action: CartAction) {
    const outcome = await applyCartActions(guestId, boardId, { actions: [action] }, db)
    return outcome.results[0]
  }

  // Correlates a search_products call with the add_item call that (usually)
  // follows it in the same turn, so add_item knows which runner-up
  // candidates to stash. Turn-scoped only (this factory is called fresh per
  // HTTP request) — cross-turn persistence is what agent-alternates.ts is
  // for; this is just same-turn bookkeeping.
  let lastSearchCandidateIds: string[] = []

  return {
    search_products: tool({
      description: `Search the product catalog by query, category, and max price. Returns up to ${CANDIDATE_POOL_SIZE} close matches — use this to find a productId before adding it to the cart.`,
      inputSchema: z.object({
        query: z.string().optional().describe('Free-text search, e.g. "desk lamp"'),
        category: z.string().optional(),
        maxPriceCents: z.number().int().positive().optional(),
      }),
      execute: async ({ query, category, maxPriceCents }) => {
        const products = (await searchProducts({ query, category, maxPriceCents })).slice(0, CANDIDATE_POOL_SIZE)
        lastSearchCandidateIds = products.map((p) => p.id)
        return products.map((p) => ({
          productId: p.id,
          name: p.name,
          merchantName: p.merchantName,
          priceCents: p.priceCents,
          category: p.category,
          description: p.description,
        }))
      },
    }),

    add_item: tool({
      description: 'Add a product to the cart by productId.',
      inputSchema: z.object({ productId: z.string(), quantity: z.number().int().positive().optional() }),
      execute: async ({ productId, quantity }) => {
        const result = await runAction({ type: 'ADD', productId, quantity })
        if (result.ok) {
          const alternates = lastSearchCandidateIds.filter((id) => id !== productId)
          await storeAlternates(boardId, productId, alternates, db)
        }
        return result
      },
    }),

    remove_item: tool({
      description: 'Remove a product from the cart by productId. Fails if the item is locked.',
      inputSchema: z.object({ productId: z.string() }),
      execute: async ({ productId }) => {
        const result = await runAction({ type: 'REMOVE', productId })
        if (result.ok) await dropAlternates(boardId, productId, db)
        return result
      },
    }),

    replace_item: tool({
      description: 'Remove one product and add another in the same action, e.g. swapping the rug for a different one. Prefer swap_item when the user just wants an alternative to something already in the cart — it reuses candidates from the original search instead of a fresh one.',
      inputSchema: z.object({
        removeProductId: z.string(),
        addProductId: z.string(),
        quantity: z.number().int().positive().optional(),
      }),
      execute: async ({ removeProductId, addProductId, quantity }) => {
        const result = await runAction({ type: 'REPLACE', removeProductId, addProductId, quantity })
        if (result.ok) await dropAlternates(boardId, removeProductId, db)
        return result
      },
    }),

    swap_item: tool({
      description: 'Swap a product already in the cart for the next-best alternative from its original search, without re-searching. Use this when the user says something like "swap this out" / "show me something else" for an item already in the cart. If there are no queued alternatives left, fall back to search_products + replace_item instead.',
      inputSchema: z.object({ productId: z.string().describe('The product currently in the cart to swap out') }),
      execute: async ({ productId }) => {
        const next = await popNextAlternate(boardId, productId, db)
        if (!next) {
          return { ok: false, error: 'No queued alternatives for this item — search for a replacement instead.', code: 'NO_ALTERNATES' }
        }
        const result = await runAction({ type: 'REPLACE', removeProductId: productId, addProductId: next.nextProductId })
        if (result.ok && next.remaining.length > 0) {
          await storeAlternates(boardId, next.nextProductId, next.remaining, db)
        }
        return { ...result, swappedToProductId: next.nextProductId }
      },
    }),

    lock_item: tool({
      description: 'Lock a product in the cart so future edits leave it untouched, e.g. "keep the lamp".',
      inputSchema: z.object({ productId: z.string() }),
      execute: ({ productId }) => runAction({ type: 'LOCK', productId }),
    }),

    unlock_item: tool({
      description: 'Unlock a previously locked product.',
      inputSchema: z.object({ productId: z.string() }),
      execute: ({ productId }) => runAction({ type: 'UNLOCK', productId }),
    }),

    set_budget: tool({
      description: 'Set or clear the cart budget in cents. Pass null to clear it.',
      inputSchema: z.object({ budgetCents: z.number().int().positive().nullable() }),
      execute: ({ budgetCents }) => runAction({ type: 'SET_BUDGET', budgetCents }),
    }),
  }
}
