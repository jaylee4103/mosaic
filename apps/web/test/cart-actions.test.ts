import { expect, test } from 'bun:test'
import { createBoard } from '../lib/server/boards'
import { applyCartActions } from '../lib/server/cart-actions'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const OTHER_GUEST_ID = 'guest-2'
const MERCHANT = { id: 'merchant-a', slug: 'sol-and-clay', name: 'Sol & Clay' }
const LAMP = {
  id: 'product-lamp',
  merchant_id: 'merchant-a',
  name: 'Ceramic Bedside Lamp',
  description: null,
  category: 'lighting',
  price_cents: 5500,
  currency: 'usd',
  image_url: null,
  product_url: null,
  available: true,
}
const RUG = { ...LAMP, id: 'product-rug', name: 'Woven Jute Rug', price_cents: 12000 }

function seedWithCatalog() {
  return createFakeSupabase({ merchants: [MERCHANT], products: [LAMP, RUG] })
}

test('ADD, LOCK, and SET_BUDGET actions apply in order and return the final cart', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  const outcome = await applyCartActions(
    GUEST_ID,
    board.id,
    { actions: [{ type: 'ADD', productId: LAMP.id }, { type: 'LOCK', productId: LAMP.id }, { type: 'SET_BUDGET', budgetCents: 10000 }] },
    client,
  )

  expect(outcome.results.every((result) => result.ok)).toBe(true)
  expect(outcome.cart.items).toHaveLength(1)
  expect(outcome.cart.items[0].locked).toBe(true)
  expect(outcome.cart.budgetCents).toBe(10000)
  expect(outcome.cart.remainingCents).toBe(4500)
})

test('REMOVE on a locked item is rejected but does not fail the whole batch', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  await applyCartActions(GUEST_ID, board.id, { actions: [{ type: 'ADD', productId: LAMP.id }, { type: 'LOCK', productId: LAMP.id }] }, client)

  const outcome = await applyCartActions(GUEST_ID, board.id, { actions: [{ type: 'REMOVE', productId: LAMP.id }] }, client)

  expect(outcome.results[0]).toMatchObject({ type: 'REMOVE', ok: false, code: 'LOCKED' })
  expect(outcome.cart.items).toHaveLength(1)
})

test('REPLACE swaps a product for another, and is blocked when the outgoing item is locked', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  await applyCartActions(GUEST_ID, board.id, { actions: [{ type: 'ADD', productId: LAMP.id }] }, client)

  const replaced = await applyCartActions(
    GUEST_ID,
    board.id,
    { actions: [{ type: 'REPLACE', removeProductId: LAMP.id, addProductId: RUG.id }] },
    client,
  )
  expect(replaced.results[0].ok).toBe(true)
  expect(replaced.cart.items.map((item) => item.productId)).toEqual([RUG.id])

  await applyCartActions(GUEST_ID, board.id, { actions: [{ type: 'LOCK', productId: RUG.id }] }, client)
  const blocked = await applyCartActions(
    GUEST_ID,
    board.id,
    { actions: [{ type: 'REPLACE', removeProductId: RUG.id, addProductId: LAMP.id }] },
    client,
  )
  expect(blocked.results[0]).toMatchObject({ ok: false, code: 'LOCKED' })
  expect(blocked.cart.items.map((item) => item.productId)).toEqual([RUG.id])
})

test('UNLOCK allows a previously locked item to be removed afterward', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  await applyCartActions(GUEST_ID, board.id, { actions: [{ type: 'ADD', productId: LAMP.id }, { type: 'LOCK', productId: LAMP.id }] }, client)

  const outcome = await applyCartActions(
    GUEST_ID,
    board.id,
    { actions: [{ type: 'UNLOCK', productId: LAMP.id }, { type: 'REMOVE', productId: LAMP.id }] },
    client,
  )
  expect(outcome.results.every((result) => result.ok)).toBe(true)
  expect(outcome.cart.items).toEqual([])
})

test('an invalid or unrecognized action is reported per-action without failing the batch', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  const outcome = await applyCartActions(
    GUEST_ID,
    board.id,
    { actions: [{ type: 'FLY_TO_THE_MOON' }, 'not even an object', { type: 'ADD', productId: LAMP.id }] },
    client,
  )
  expect(outcome.results[0]).toMatchObject({ type: 'FLY_TO_THE_MOON', ok: false, code: 'VALIDATION' })
  expect(outcome.results[1]).toMatchObject({ type: 'UNKNOWN', ok: false, code: 'VALIDATION' })
  expect(outcome.results[2]).toMatchObject({ type: 'ADD', ok: true })
  expect(outcome.cart.items).toHaveLength(1)
})

test('a malformed request body or too many actions is a request-level validation error', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  await expect(applyCartActions(GUEST_ID, board.id, {}, client)).rejects.toMatchObject({ code: 'VALIDATION' })
  await expect(applyCartActions(GUEST_ID, board.id, { actions: [] }, client)).rejects.toMatchObject({
    code: 'VALIDATION',
  })
  const tooMany = { actions: Array.from({ length: 21 }, () => ({ type: 'SET_BUDGET', budgetCents: 1000 })) }
  await expect(applyCartActions(GUEST_ID, board.id, tooMany, client)).rejects.toMatchObject({ code: 'VALIDATION' })
})

test('a board owned by another guest fails the whole request with NOT_FOUND', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  await expect(
    applyCartActions(OTHER_GUEST_ID, board.id, { actions: [{ type: 'ADD', productId: LAMP.id }] }, client),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})
