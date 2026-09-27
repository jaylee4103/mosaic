import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { notFoundError, validationError } from './errors'
import { getProductsByIds, type Product } from './products'
import { getSupabaseAdmin } from './supabase'

// Deterministic cart per the root README: prices, quantities, totals, and
// remaining budget are always calculated here from the live `products`
// catalog — never trusted from the client or cached on the cart item.
export type CartItem = {
  id: string
  productId: string
  product: Product | null // null if the product no longer exists in the catalog
  quantity: number
  locked: boolean
  subtotalCents: number
}

export type Cart = {
  id: string
  boardId: string
  currency: string
  budgetCents: number | null
  status: string
  items: CartItem[]
  totalCents: number
  remainingCents: number | null
}

type CartRow = { id: string; board_id: string; currency: string; budget_cents: number | null; status: string }
type CartItemRow = { id: string; product_id: string; quantity: number; locked: boolean }

async function findOrCreateCartRow(guestId: string, boardId: string, db: SupabaseClient): Promise<CartRow> {
  await assertBoardOwnership(guestId, boardId, db)

  // Resume the same cart through its whole open -> checkout lifecycle (needed
  // so a started checkout can find itself again); only 'completed'/'abandoned'
  // carts are excluded, so a finished checkout starts a fresh cart next time.
  const { data, error } = await db
    .from('carts')
    .select('id, board_id, currency, budget_cents, status')
    .eq('board_id', boardId)
    .eq('guest_session_id', guestId)
    .in('status', ['open', 'checkout'])
    .order('created_at', { ascending: false })
  if (error) throw new Error('Could not look up cart')
  // Older concurrent first reads may have created two open carts. Keep a
  // checkout cart if one exists, otherwise use the newest open cart.
  const rows = (data ?? []) as CartRow[]
  const existing = rows.find((row) => row.status === 'checkout') ?? rows[0]
  if (existing) return existing

  const { data: created, error: createError } = await db
    .from('carts')
    .insert({ guest_session_id: guestId, board_id: boardId, currency: 'usd', status: 'open', budget_cents: null })
    .select('id, board_id, currency, budget_cents, status')
    .single()
  if (createError || !created) throw new Error('Could not create cart')
  return created as CartRow
}

async function buildCart(cartRow: CartRow, db: SupabaseClient): Promise<Cart> {
  const { data, error } = await db
    .from('cart_items')
    .select('id, product_id, quantity, locked')
    .eq('cart_id', cartRow.id)
  if (error) throw new Error('Could not load cart items')
  const itemRows = (data ?? []) as CartItemRow[]
  const productsById = await getProductsByIds(
    itemRows.map((row) => row.product_id),
    db,
  )

  let totalCents = 0
  const items: CartItem[] = itemRows.map((row) => {
    const product = productsById.get(row.product_id) ?? null
    const subtotalCents = (product?.priceCents ?? 0) * row.quantity
    totalCents += subtotalCents
    return { id: row.id, productId: row.product_id, product, quantity: row.quantity, locked: row.locked, subtotalCents }
  })

  return {
    id: cartRow.id,
    boardId: cartRow.board_id,
    currency: cartRow.currency,
    budgetCents: cartRow.budget_cents,
    status: cartRow.status,
    items,
    totalCents,
    remainingCents: cartRow.budget_cents === null ? null : cartRow.budget_cents - totalCents,
  }
}

function assertValidQuantity(quantity: unknown): asserts quantity is number {
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) {
    throw validationError('Quantity must be an integer between 1 and 99')
  }
}

function assertCartIsOpen(cartRow: CartRow): void {
  if (cartRow.status !== 'open') throw validationError('Cart is locked while checkout is in progress')
}

export async function getCart(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Cart> {
  const cartRow = await findOrCreateCartRow(guestId, boardId, db)
  return buildCart(cartRow, db)
}

// Resolves a product to its cart_items row so callers (e.g. cart-actions.ts)
// that only know a productId — not the internal cart item id — can look up
// or check the lock state before mutating.
export async function findCartItemByProduct(
  guestId: string,
  boardId: string,
  productId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<{ id: string; locked: boolean } | null> {
  const cartRow = await findOrCreateCartRow(guestId, boardId, db)
  const { data, error } = await db
    .from('cart_items')
    .select('id, locked')
    .eq('cart_id', cartRow.id)
    .eq('product_id', productId)
    .maybeSingle()
  if (error) throw new Error('Could not look up cart item')
  return data as { id: string; locked: boolean } | null
}

export async function addCartItem(
  guestId: string,
  boardId: string,
  input: { productId: unknown; quantity?: unknown },
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Cart> {
  const cartRow = await findOrCreateCartRow(guestId, boardId, db)
  assertCartIsOpen(cartRow)

  if (typeof input.productId !== 'string' || input.productId.length === 0) {
    throw validationError('productId is required')
  }
  const quantity = input.quantity ?? 1
  assertValidQuantity(quantity)

  const productsById = await getProductsByIds([input.productId], db)
  const product = productsById.get(input.productId)
  if (!product || !product.available) throw notFoundError('Product not found or unavailable')

  const { data: existing, error: existingError } = await db
    .from('cart_items')
    .select('id')
    .eq('cart_id', cartRow.id)
    .eq('product_id', input.productId)
    .maybeSingle()
  if (existingError) throw new Error('Could not check for an existing cart item')
  if (existing) throw validationError('Product is already in the cart; use PATCH to change its quantity')

  const { error } = await db
    .from('cart_items')
    .insert({ cart_id: cartRow.id, product_id: input.productId, quantity, locked: false })
  if (error) throw new Error('Could not add item to cart')

  return buildCart(cartRow, db)
}

export async function updateCartItem(
  guestId: string,
  boardId: string,
  itemId: string,
  input: { quantity?: unknown; locked?: unknown },
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Cart> {
  const cartRow = await findOrCreateCartRow(guestId, boardId, db)
  assertCartIsOpen(cartRow)

  const updates: Record<string, unknown> = {}
  if (input.quantity !== undefined) {
    assertValidQuantity(input.quantity)
    updates.quantity = input.quantity
  }
  if (input.locked !== undefined) {
    if (typeof input.locked !== 'boolean') throw validationError('locked must be a boolean')
    updates.locked = input.locked
  }
  if (Object.keys(updates).length === 0) throw validationError('No fields to update')

  const { data, error } = await db
    .from('cart_items')
    .update(updates)
    .eq('id', itemId)
    .eq('cart_id', cartRow.id)
    .select('id')
    .maybeSingle()
  if (error) throw new Error('Could not update cart item')
  if (!data) throw notFoundError('Cart item not found')

  return buildCart(cartRow, db)
}

export async function removeCartItem(
  guestId: string,
  boardId: string,
  itemId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Cart> {
  const cartRow = await findOrCreateCartRow(guestId, boardId, db)
  assertCartIsOpen(cartRow)

  const { data, error } = await db.from('cart_items').delete().eq('id', itemId).eq('cart_id', cartRow.id).select('id')
  if (error) throw new Error('Could not remove cart item')
  if (!Array.isArray(data) || data.length === 0) throw notFoundError('Cart item not found')

  return buildCart(cartRow, db)
}

export async function setCartBudget(
  guestId: string,
  boardId: string,
  input: { budgetCents: unknown },
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Cart> {
  const cartRow = await findOrCreateCartRow(guestId, boardId, db)
  assertCartIsOpen(cartRow)

  let budgetCents: number | null
  if (input.budgetCents === null) {
    budgetCents = null
  } else if (Number.isInteger(input.budgetCents) && (input.budgetCents as number) >= 0) {
    budgetCents = input.budgetCents as number
  } else {
    throw validationError('budgetCents must be a non-negative integer or null')
  }

  const { error } = await db
    .from('carts')
    .update({ budget_cents: budgetCents, updated_at: new Date().toISOString() })
    .eq('id', cartRow.id)
  if (error) throw new Error('Could not update cart budget')

  return buildCart({ ...cartRow, budget_cents: budgetCents }, db)
}
