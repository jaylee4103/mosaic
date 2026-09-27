import type { SupabaseClient } from '@supabase/supabase-js'
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { applyCartActions, type CartAction } from '@/lib/server/cart-actions'
import { searchProducts } from '@/lib/server/products'
import { getSupabaseAdmin } from '@/lib/server/supabase'

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

  return {
    search_products: tool({
      description: 'Search the product catalog by query, category, and max price. Use this to find a productId before adding it to the cart.',
      inputSchema: z.object({
        query: z.string().optional().describe('Free-text search, e.g. "desk lamp"'),
        category: z.string().optional(),
        maxPriceCents: z.number().int().positive().optional(),
      }),
      execute: async ({ query, category, maxPriceCents }) => {
        const products = await searchProducts({ query, category, maxPriceCents })
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
      execute: ({ productId, quantity }) => runAction({ type: 'ADD', productId, quantity }),
    }),

    remove_item: tool({
      description: 'Remove a product from the cart by productId. Fails if the item is locked.',
      inputSchema: z.object({ productId: z.string() }),
      execute: ({ productId }) => runAction({ type: 'REMOVE', productId }),
    }),

    replace_item: tool({
      description: 'Remove one product and add another in the same action, e.g. swapping the rug for a different one.',
      inputSchema: z.object({
        removeProductId: z.string(),
        addProductId: z.string(),
        quantity: z.number().int().positive().optional(),
      }),
      execute: ({ removeProductId, addProductId, quantity }) =>
        runAction({ type: 'REPLACE', removeProductId, addProductId, quantity }),
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
