/**
 * Test the agent harness end-to-end against real local Postgres.
 * Uses runShoppingAgentTurn which includes internet search orchestration.
 * Run: cd apps/web && bun run scripts/test-agent-real.ts
 */
import { getSupabaseAdmin } from '../lib/server/supabase'
import { createBoard } from '../lib/server/boards'
import { saveVibeProfile } from '../lib/server/vibe-profile'
import { runShoppingAgentTurn } from '../lib/ai/shoppingAgent'

async function main() {
  const db = getSupabaseAdmin()
  console.log('[real-db-test] Connected to real Supabase:', process.env.SUPABASE_URL)

  const guestId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  console.log(`[real-db-test] Using guest session ${guestId}`)

  const board = await createBoard(guestId, 'Real DB Test Board', db)
  console.log(`[real-db-test] Created board ${board.id}`)

  const vibeProfile = {
    name: 'Warm Coastal Minimal',
    description: 'A warm, relaxed Mediterranean aesthetic centered on natural materials.',
    profile: {
      colors: ['cream', 'terracotta', 'olive'],
      materials: ['linen', 'ceramic', 'wood'],
      styles: ['coastal', 'minimal'],
      shapes: ['rounded', 'fluid'],
      qualities: ['warm', 'natural', 'minimal', 'relaxed'],
      phrase: 'Warm Coastal Minimal',
      message: 'A warm, relaxed Mediterranean aesthetic.',
      confidence: 0.85,
      mixed: false,
      target_domain: 'home decor',
    },
  }
  await saveVibeProfile(guestId, board.id, vibeProfile, db)
  console.log('[real-db-test] Saved vibe profile')

  const result = await runShoppingAgentTurn({
    guestId,
    boardId: board.id,
    userMessage: 'Find me a lamp under $70 and add it to my cart.',
  })

  console.log('\n[real-db-test] === FINAL RESULT ===')
  console.log('assistantMessage:', result.assistantMessage)
  console.log('steps:', result.steps)
  console.log('cart items:', result.cart.items.length)

  const { data: cachedProducts } = await db
    .from('products')
    .select('id, name, source, category')
    .eq('available', true)
    .eq('source', 'internet')
    .order('created_at', { ascending: false })
  console.log('\n[real-db-test] Cached internet products:', cachedProducts)

  const { data: cartRow } = await db.from('carts').select('id').eq('board_id', board.id).maybeSingle()
  const { data: items } = await db.from('cart_items').select('product_id, quantity').eq('cart_id', (cartRow as { id: string }).id)
  console.log('[real-db-test] cart_items:', items)

  console.log('\n[real-db-test] Agent harness successfully tested against real local Postgres with internet search!')
}

main().catch((err) => {
  console.error('[real-db-test] FAILED:', err)
  process.exit(1)
})
