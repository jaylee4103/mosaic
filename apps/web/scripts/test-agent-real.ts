/**
 * Test the agent harness against the REAL local Postgres (Supabase).
 * Run: cd apps/web && bun run scripts/test-agent-real.ts
 * Requires: supabase start + .env.local pointing to localhost
 */
import { getSupabaseAdmin } from '../lib/server/supabase'
import { createBoard } from '../lib/server/boards'
import { runAgentTurn } from '../lib/ai/harness'
import { resolveAgentModel } from '../lib/ai/providers'
import { createShoppingTools } from '../lib/ai/tools/shoppingTools'

async function main() {
  const db = getSupabaseAdmin()
  console.log('[real-db-test] Connected to real Supabase:', process.env.SUPABASE_URL)

  // Use a pre-created guest session (created via psql to avoid RLS issues)
  const guestId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  console.log(`[real-db-test] Using guest session ${guestId}`)

  const board = await createBoard(guestId, 'Real DB Test Board', db)
  console.log(`[real-db-test] Created board ${board.id}`)

  const tools = createShoppingTools(guestId, board.id, db)
  const model = resolveAgentModel()

  const result = await runAgentTurn({
    model,
    tools,
    system: "You are Mosaic's shopping agent. Use search_products to find a matching product, then add_item to add it to the cart.",
    messages: [{ role: 'user', content: 'Find me a lamp under $70 and add it to my cart.' }],
  })

  console.log('\n[real-db-test] === FINAL RESULT ===')
  console.log('assistantMessage:', result.assistantMessage)
  console.log('steps:', result.steps)

  const { data: cartRow } = await db.from('carts').select('id').eq('board_id', board.id).maybeSingle()
  const { data: items } = await db.from('cart_items').select('product_id, quantity').eq('cart_id', (cartRow as { id: string } | null)?.id ?? '')
  console.log('cart_items:', items)
  console.log('\n[real-db-test] Agent harness successfully tested against real local Postgres!')
}

main().catch((err) => {
  console.error('[real-db-test] FAILED:', err)
  process.exit(1)
})
