import { expect, test } from 'bun:test'
import { MockLanguageModelV4 } from 'ai/test'
import { createBoard } from '../lib/server/boards'
import { runAgentTurn } from '../lib/ai/harness'
import { createShoppingTools } from '../lib/ai/tools/shoppingTools'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const MERCHANT = { id: 'merchant-a', slug: 'sol-and-clay', name: 'Sol & Clay' }

// Five lamp-like products so search_products + the CANDIDATE_POOL_SIZE=4 cap
// in shoppingTools.ts both actually get exercised.
const LAMPS = Array.from({ length: 5 }, (_, i) => ({
  id: `lamp-${i}`,
  merchant_id: 'merchant-a',
  name: `Ceramic Desk Lamp ${i}`,
  description: 'Warm ceramic lamp.',
  category: 'lighting',
  price_cents: 4000 + i * 100,
  currency: 'usd',
  image_url: null,
  product_url: null,
  available: true,
}))

function seedCatalog() {
  return createFakeSupabase({ merchants: [MERCHANT], products: LAMPS })
}

// --- Direct tool-execution tests (bypass the LLM entirely) ---------------
// These prove the DB-backed swap-candidate plumbing (agent-alternates.ts)
// actually works, independent of any model/provider.

test('search_products caps results at CANDIDATE_POOL_SIZE and add_item stashes the rest as alternates', async () => {
  const { client } = seedCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  const tools = createShoppingTools(GUEST_ID, board.id, client)

  const searchResult = (await tools.search_products.execute!(
    { query: 'lamp' },
    { toolCallId: 't1', messages: [], context: undefined },
  )) as Array<{ productId: string }>
  console.log('[test] search_products returned:', searchResult.map((p) => p.productId))
  expect(searchResult).toHaveLength(4) // capped, even though 5 lamps exist

  const chosenId = searchResult[0].productId
  const addResult = (await tools.add_item.execute!(
    { productId: chosenId },
    { toolCallId: 't2', messages: [], context: undefined },
  )) as { ok: boolean }
  expect(addResult.ok).toBe(true)

  const { data } = await client
    .from('agent_product_alternates')
    .select('alternate_product_ids')
    .eq('board_id', board.id)
    .eq('product_id', chosenId)
    .maybeSingle()
  const stashed = (data as { alternate_product_ids: string[] } | null)?.alternate_product_ids ?? []
  console.log('[test] stashed alternates for', chosenId, ':', stashed)
  expect(stashed).toHaveLength(3) // 4 candidates minus the one added
  expect(stashed).not.toContain(chosenId)
})

test('swap_item pops the next queued alternate instead of failing, and re-stores the remaining queue', async () => {
  const { client } = seedCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  const tools = createShoppingTools(GUEST_ID, board.id, client)

  const searchResult = (await tools.search_products.execute!(
    { query: 'lamp' },
    { toolCallId: 't1', messages: [], context: undefined },
  )) as Array<{ productId: string }>
  const firstChoice = searchResult[0].productId
  await tools.add_item.execute!({ productId: firstChoice }, { toolCallId: 't2', messages: [], context: undefined })

  const swapResult = (await tools.swap_item.execute!(
    { productId: firstChoice },
    { toolCallId: 't3', messages: [], context: undefined },
  )) as { ok: boolean; swappedToProductId: string }
  console.log('[test] swap_item result:', swapResult)
  expect(swapResult.ok).toBe(true)
  expect(swapResult.swappedToProductId).not.toBe(firstChoice)
  expect(swapResult.swappedToProductId).toBe(searchResult[1].productId) // next in the ranked queue

  const { data: cartRow } = await client.from('carts').select('id').eq('board_id', board.id).maybeSingle()
  const { data: cartRows } = await client.from('cart_items').select('product_id').eq('cart_id', (cartRow as { id: string }).id)
  console.log('[test] cart_items after swap:', cartRows)
  expect((cartRows as Array<{ product_id: string }>).map((r) => r.product_id)).toEqual([swapResult.swappedToProductId])

  // Old key's row should be gone, new key should hold the remaining 2 alternates.
  const { data: oldRow } = await client.from('agent_product_alternates').select('*').eq('board_id', board.id).eq('product_id', firstChoice).maybeSingle()
  const { data: newRow } = await client.from('agent_product_alternates').select('alternate_product_ids').eq('board_id', board.id).eq('product_id', swapResult.swappedToProductId).maybeSingle()
  expect(oldRow).toBeNull()
  expect((newRow as { alternate_product_ids: string[] } | null)?.alternate_product_ids).toHaveLength(2)
})

test('swap_item reports NO_ALTERNATES once the queue is exhausted', async () => {
  const { client } = seedCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  const tools = createShoppingTools(GUEST_ID, board.id, client)

  const searchResult = (await tools.search_products.execute!({ query: 'lamp' }, { toolCallId: 't1', messages: [], context: undefined })) as Array<{ productId: string }>
  let current = searchResult[0].productId
  await tools.add_item.execute!({ productId: current }, { toolCallId: 't2', messages: [], context: undefined })

  // 4 candidates -> 3 alternates -> 3 successful swaps -> 4th swap should fail.
  for (let i = 0; i < 3; i++) {
    const swap = (await tools.swap_item.execute!({ productId: current }, { toolCallId: `t${3 + i}`, messages: [], context: undefined })) as {
      ok: boolean
      swappedToProductId: string
    }
    expect(swap.ok).toBe(true)
    current = swap.swappedToProductId
  }

  const exhausted = (await tools.swap_item.execute!({ productId: current }, { toolCallId: 't-final', messages: [], context: undefined })) as {
    ok: boolean
    code?: string
  }
  console.log('[test] exhausted swap result:', exhausted)
  expect(exhausted.ok).toBe(false)
  expect(exhausted.code).toBe('NO_ALTERNATES')
})

// --- Harness test with a scripted mock model ------------------------------
// Proves runAgentTurn (the generic loop) correctly drives ANY LanguageModel
// through a multi-step tool-calling sequence, with zero network/API key
// dependency — the model is swappable in the exact sense this whole
// harness was built around.

test('runAgentTurn drives a scripted mock model through search -> add -> final reply', async () => {
  const { client } = seedCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  const tools = createShoppingTools(GUEST_ID, board.id, client)

  const model = new MockLanguageModelV4({
    doGenerate: [
      {
        finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
        usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
        warnings: [],
        content: [
          { type: 'tool-call', toolCallId: 'call-1', toolName: 'search_products', input: JSON.stringify({ query: 'lamp' }) },
        ],
      },
      {
        finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
        usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
        warnings: [],
        content: [
          { type: 'tool-call', toolCallId: 'call-2', toolName: 'add_item', input: JSON.stringify({ productId: 'lamp-0' }) },
        ],
      },
      {
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
        warnings: [],
        content: [{ type: 'text', text: 'Added the Ceramic Desk Lamp 0 to your cart.' }],
      },
    ],
  })

  const result = await runAgentTurn({
    model,
    tools,
    system: 'test system prompt',
    messages: [{ role: 'user', content: 'find me a lamp' }],
  })

  console.log('[test] harness result:', result)
  expect(result.steps).toBe(3)
  expect(result.assistantMessage).toContain('Ceramic Desk Lamp 0')

  const { data: cartRow } = await client.from('carts').select('id').eq('board_id', board.id).maybeSingle()
  const { data: items } = await client.from('cart_items').select('product_id').eq('cart_id', (cartRow as { id: string }).id)
  expect((items as Array<{ product_id: string }>).map((i) => i.product_id)).toEqual(['lamp-0'])
})
