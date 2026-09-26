import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { addCartItem, findCartItemByProduct, getCart, removeCartItem, setCartBudget, updateCartItem, type Cart } from './cart'
import { lockedError, notFoundError, validationError } from './errors'
import { getSupabaseAdmin } from './supabase'

// The AI decides *what* it wants to change; this module decides *whether and
// how* the change actually happens, per the root README's AI/deterministic
// split. Actions reference products by productId (matching the README's
// LOCK_ITEM/REMOVE_ITEM examples), not internal cart item ids, since that's
// the identifier the shopping agent reasons about.
export type CartAction =
  | { type: 'ADD'; productId: string; quantity?: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'REPLACE'; removeProductId: string; addProductId: string; quantity?: number }
  | { type: 'LOCK'; productId: string }
  | { type: 'UNLOCK'; productId: string }
  | { type: 'SET_BUDGET'; budgetCents: number | null }

type ActionType = CartAction['type']

export type CartActionResult = {
  type: ActionType | 'UNKNOWN'
  ok: boolean
  error?: string
  code?: string
}

export type CartActionsResult = {
  results: CartActionResult[]
  cart: Cart
}

const MAX_ACTIONS = 20

function actionTypeOf(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    const type = (raw as { type?: unknown }).type
    if (typeof type === 'string') return type
  }
  return 'UNKNOWN'
}

function parseAction(raw: unknown): CartAction | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const quantity = typeof r.quantity === 'number' ? r.quantity : undefined

  switch (r.type) {
    case 'ADD':
      return typeof r.productId === 'string' && r.productId ? { type: 'ADD', productId: r.productId, quantity } : null
    case 'REMOVE':
      return typeof r.productId === 'string' && r.productId ? { type: 'REMOVE', productId: r.productId } : null
    case 'REPLACE':
      return typeof r.removeProductId === 'string' && r.removeProductId &&
        typeof r.addProductId === 'string' && r.addProductId
        ? { type: 'REPLACE', removeProductId: r.removeProductId, addProductId: r.addProductId, quantity }
        : null
    case 'LOCK':
      return typeof r.productId === 'string' && r.productId ? { type: 'LOCK', productId: r.productId } : null
    case 'UNLOCK':
      return typeof r.productId === 'string' && r.productId ? { type: 'UNLOCK', productId: r.productId } : null
    case 'SET_BUDGET':
      return r.budgetCents === null || typeof r.budgetCents === 'number'
        ? { type: 'SET_BUDGET', budgetCents: r.budgetCents as number | null }
        : null
    default:
      return null
  }
}

async function requireUnlockedCartItem(
  guestId: string,
  boardId: string,
  productId: string,
  db: SupabaseClient,
): Promise<{ id: string }> {
  const item = await findCartItemByProduct(guestId, boardId, productId, db)
  if (!item) throw notFoundError('Product is not in the cart')
  if (item.locked) throw lockedError('Cannot change a locked item; unlock it first')
  return item
}

async function applyAction(
  guestId: string,
  boardId: string,
  action: CartAction,
  db: SupabaseClient,
): Promise<void> {
  switch (action.type) {
    case 'ADD':
      await addCartItem(guestId, boardId, { productId: action.productId, quantity: action.quantity }, db)
      return
    case 'REMOVE': {
      const item = await requireUnlockedCartItem(guestId, boardId, action.productId, db)
      await removeCartItem(guestId, boardId, item.id, db)
      return
    }
    case 'REPLACE': {
      const item = await requireUnlockedCartItem(guestId, boardId, action.removeProductId, db)
      await removeCartItem(guestId, boardId, item.id, db)
      await addCartItem(guestId, boardId, { productId: action.addProductId, quantity: action.quantity }, db)
      return
    }
    case 'LOCK': {
      const item = await findCartItemByProduct(guestId, boardId, action.productId, db)
      if (!item) throw notFoundError('Product is not in the cart')
      await updateCartItem(guestId, boardId, item.id, { locked: true }, db)
      return
    }
    case 'UNLOCK': {
      const item = await findCartItemByProduct(guestId, boardId, action.productId, db)
      if (!item) throw notFoundError('Product is not in the cart')
      await updateCartItem(guestId, boardId, item.id, { locked: false }, db)
      return
    }
    case 'SET_BUDGET':
      await setCartBudget(guestId, boardId, { budgetCents: action.budgetCents }, db)
      return
  }
}

export async function applyCartActions(
  guestId: string,
  boardId: string,
  body: unknown,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<CartActionsResult> {
  // Checked once up front: an unowned board is a real 404 for the whole
  // request, not something to report per-action.
  await assertBoardOwnership(guestId, boardId, db)

  const rawActions =
    typeof body === 'object' && body !== null && Array.isArray((body as { actions?: unknown }).actions)
      ? (body as { actions: unknown[] }).actions
      : null
  if (!rawActions) throw validationError('Request body must be { actions: [...] }')
  if (rawActions.length === 0) throw validationError('actions must be a non-empty array')
  if (rawActions.length > MAX_ACTIONS) throw validationError(`Too many actions in one request (max ${MAX_ACTIONS})`)

  const results: CartActionResult[] = []
  for (const raw of rawActions) {
    const action = parseAction(raw)
    if (!action) {
      results.push({ type: actionTypeOf(raw) as ActionType | 'UNKNOWN', ok: false, error: 'Invalid or unrecognized action', code: 'VALIDATION' })
      continue
    }
    try {
      await applyAction(guestId, boardId, action, db)
      results.push({ type: action.type, ok: true })
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
      const message = error instanceof Error ? error.message : 'Action failed'
      results.push({ type: action.type, ok: false, error: message, code })
    }
  }

  const cart = await getCart(guestId, boardId, db)
  return { results, cart }
}
