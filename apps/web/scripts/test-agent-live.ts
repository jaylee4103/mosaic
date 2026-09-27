/**
 * One-off manual test: exercises the REAL OpenRouter call + real tool set
 * against a fake (in-memory) Supabase double, so it doesn't need a real
 * Supabase project — just OPENROUTER_API_KEY. Not part of the test suite;
 * run directly: bun run scripts/test-agent-live.ts
 */
import { createBoard } from '../lib/server/boards'
import { runAgentTurn } from '../lib/ai/harness'
import { resolveAgentModel } from '../lib/ai/providers'
import { createShoppingTools } from '../lib/ai/tools/shoppingTools'
import { createFakeSupabase } from '../test/support/fake-supabase'

const GUEST_ID = 'guest-live-test'
const MERCHANT = { id: 'merchant-a', slug: 'sol-and-clay', name: 'Sol & Clay' }
const PRODUCTS = [
  { id: 'lamp-ceramic', merchant_id: 'merchant-a', name: 'Ceramic Bedside Lamp', description: 'Warm ceramic lamp with a linen shade.', category: 'lighting', price_cents: 5500, currency: 'usd', image_url: null, product_url: null, available: true },
  { id: 'lamp-brass', merchant_id: 'merchant-a', name: 'Brass Desk Lamp', description: 'Articulated brass desk lamp.', category: 'lighting', price_cents: 8900, currency: 'usd', image_url: null, product_url: null, available: true },
  { id: 'rug-jute', merchant_id: 'merchant-a', name: 'Woven Jute Rug', description: 'Natural jute area rug.', category: 'rugs', price_cents: 12000, currency: 'usd', image_url: null, product_url: null, available: true },
]

async function main() {
  const { client } = createFakeSupabase({ merchants: [MERCHANT], products: PRODUCTS })
  const board = await createBoard(GUEST_ID, 'Live Test Board', client)
  console.log(`[live-test] created board ${board.id}`)

  const tools = createShoppingTools(GUEST_ID, board.id, client)
  const model = resolveAgentModel() // temp default: OpenRouter, cheap model (see providers.ts)

  const result = await runAgentTurn({
    model,
    tools,
    system: 'You are Mosaic\'s shopping agent. Use search_products to find a matching product, then add_item to add it to the cart.',
    messages: [{ role: 'user', content: 'Find me a lamp under $70 and add it to my cart.' }],
  })

  console.log('\n[live-test] === FINAL RESULT ===')
  console.log('assistantMessage:', result.assistantMessage)
  console.log('steps:', result.steps)

  const { data: cartRow } = await client.from('carts').select('id').eq('board_id', board.id).maybeSingle()
  const { data: items } = await client.from('cart_items').select('product_id, quantity').eq('cart_id', (cartRow as { id: string } | null)?.id ?? '')
  console.log('cart_items:', items)
}

main().catch((err) => {
  console.error('[live-test] FAILED:', err)
  process.exit(1)
})
