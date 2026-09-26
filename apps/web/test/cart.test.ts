import { expect, test } from 'bun:test'
import { addCartItem, getCart, removeCartItem, setCartBudget, updateCartItem } from '../lib/server/cart'
import { createBoard } from '../lib/server/boards'
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
const UNAVAILABLE = { ...LAMP, id: 'product-gone', name: 'Discontinued Vase', available: false }

function seedWithCatalog() {
  return createFakeSupabase({ merchants: [MERCHANT], products: [LAMP, UNAVAILABLE] })
}

test('getCart auto-creates an empty cart for a board with no budget set', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Dream Apartment', client)

  const cart = await getCart(GUEST_ID, board.id, client)
  expect(cart.items).toEqual([])
  expect(cart.totalCents).toBe(0)
  expect(cart.remainingCents).toBeNull()
  expect(cart.boardId).toBe(board.id)
})

test('addCartItem prices the item from the live catalog, not the client', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Dream Apartment', client)

  const cart = await addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 2 }, client)
  expect(cart.items).toHaveLength(1)
  expect(cart.items[0].product?.priceCents).toBe(5500)
  expect(cart.items[0].subtotalCents).toBe(11000)
  expect(cart.totalCents).toBe(11000)
})

test('addCartItem rejects an unknown or unavailable product', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  await expect(addCartItem(GUEST_ID, board.id, { productId: 'nonexistent' }, client)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
  await expect(addCartItem(GUEST_ID, board.id, { productId: UNAVAILABLE.id }, client)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

test('addCartItem validates quantity and rejects duplicate products', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  await expect(addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 0 }, client)).rejects.toMatchObject({
    code: 'VALIDATION',
  })
  await addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 1 }, client)
  await expect(addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 1 }, client)).rejects.toMatchObject({
    code: 'VALIDATION',
  })
})

test('updateCartItem changes quantity/locked and recomputes totals; 404s for an unknown item', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  const added = await addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 1 }, client)
  const itemId = added.items[0].id

  const updated = await updateCartItem(GUEST_ID, board.id, itemId, { quantity: 3, locked: true }, client)
  expect(updated.items[0].quantity).toBe(3)
  expect(updated.items[0].locked).toBe(true)
  expect(updated.totalCents).toBe(16500)

  await expect(updateCartItem(GUEST_ID, board.id, 'missing-item', { quantity: 1 }, client)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

test('removeCartItem removes the item and recomputes totals; 404s for an unknown item', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  const added = await addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 1 }, client)
  const itemId = added.items[0].id

  const cart = await removeCartItem(GUEST_ID, board.id, itemId, client)
  expect(cart.items).toEqual([])
  expect(cart.totalCents).toBe(0)

  await expect(removeCartItem(GUEST_ID, board.id, itemId, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('setCartBudget sets and clears the budget, computing remainingCents', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  await addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 1 }, client)

  const withBudget = await setCartBudget(GUEST_ID, board.id, { budgetCents: 30000 }, client)
  expect(withBudget.budgetCents).toBe(30000)
  expect(withBudget.remainingCents).toBe(24500)

  const cleared = await setCartBudget(GUEST_ID, board.id, { budgetCents: null }, client)
  expect(cleared.budgetCents).toBeNull()
  expect(cleared.remainingCents).toBeNull()

  await expect(setCartBudget(GUEST_ID, board.id, { budgetCents: -1 }, client)).rejects.toMatchObject({
    code: 'VALIDATION',
  })
})

test('cart prices reflect the current catalog, not a stale snapshot', async () => {
  const { client, tables } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)
  await addCartItem(GUEST_ID, board.id, { productId: LAMP.id, quantity: 1 }, client)

  const productRow = tables.products.find((row) => row.id === LAMP.id)!
  productRow.price_cents = 4000

  const cart = await getCart(GUEST_ID, board.id, client)
  expect(cart.items[0].subtotalCents).toBe(4000)
  expect(cart.totalCents).toBe(4000)
})

test('cart access 404s for a board owned by another guest', async () => {
  const { client } = seedWithCatalog()
  const board = await createBoard(GUEST_ID, 'Board', client)

  await expect(getCart(OTHER_GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  await expect(
    addCartItem(OTHER_GUEST_ID, board.id, { productId: LAMP.id }, client),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})
