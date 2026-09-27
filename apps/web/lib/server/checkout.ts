import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { getCart, type Cart } from './cart'
import type { DemoItem } from './demo-cart'
import { validationError } from './errors'
import { createLinkAuthorizer, type LinkApproval } from './link'
import { getSupabaseAdmin } from './supabase'
import { createStripePaymentStores } from './stripe-payments'

// Step 7: replaces the fixed $1+$2 demo cart (lib/server/demo-checkout.ts)
// with the real per-board cart, grouped by merchant, and persists results in
// the relational checkout_sessions/merchant_orders/order_items tables
// instead of the demo's single JSON blob.
//
// Real Stripe payment verification currently only works for merchants with a
// configured test secret key below — see docs/board-commerce-api.md's
// Checkout section for why this can't be auto-provisioned per merchant.
const STRIPE_KEYS_BY_MERCHANT_SLUG: Record<string, string | undefined> = {
  'sol-and-clay': process.env.STRIPE_STORE_A_TEST_SECRET_KEY,
  'north-loom': process.env.STRIPE_STORE_B_TEST_SECRET_KEY,
}

// One checkout attempt per cart at a time. Carts move open -> checkout ->
// completed, so this fixed id (paired with the unique cart_id) is enough;
// there is no multi-attempt-per-cart UI to justify a real client-supplied key.
const CHECKOUT_CLIENT_REQUEST_ID = 'checkout'

function defaultAuthorizer(): ReturnType<typeof createLinkAuthorizer> | null {
  return process.env.NODE_ENV !== 'production' && process.env.LINK_CLI_ENABLED === 'true'
    ? createLinkAuthorizer()
    : null
}

export type CheckoutMerchantOrder = {
  id: string
  merchantId: string
  merchantName: string
  amountCents: number
  currency: string
  status: string
  paymentStatus: string
  paymentMethodType: string | null
  linkVerified: boolean
  errorMessage: string | null
  checkoutUrl?: string | null
}

export type Checkout = {
  id: string
  boardId: string
  cartId: string
  status: string
  totalCents: number
  currency: string
  approvalMode: 'link_cli' | 'hosted_checkout'
  merchantOrders: CheckoutMerchantOrder[]
}

type CheckoutSessionRow = { id: string; cart_id: string; status: string; total_cents: number; currency: string }
type MerchantOrderRow = {
  id: string
  merchant_id: string
  link_spend_request_id: string | null
  external_order_id: string | null
  amount_cents: number
  currency: string
  status: string
  payment_status: string
  error_message: string | null
  payment_method_type?: string | null
  link_verified?: boolean
}
type MerchantDetail = { slug: string; name: string; websiteUrl: string | null }
type CheckoutGroup = { merchantId: string; merchantName: string; items: DemoItem[]; amountCents: number }

function groupCartForCheckout(cart: Cart): CheckoutGroup[] {
  const groups = new Map<string, CheckoutGroup>()
  for (const item of cart.items) {
    if (!item.product) throw validationError('A cart item references a product that no longer exists')
    if (!item.product.available) throw validationError(`${item.product.name} is no longer available`)
    // 'browser' merchants have no Stripe integration (no key in
    // STRIPE_KEYS_BY_MERCHANT_SLUG below) — they go through the separate
    // browser-driven checkout-proof flow instead (browserCheckout.ts). A
    // cart mixing both kinds of merchant must not fold the browser one into
    // this grouping, or preparePayments would later try (and fail) to open
    // a Stripe account for it.
    if (item.product.checkoutMethod === 'browser') continue
    const key = item.product.merchantId
    const group = groups.get(key) ?? { merchantId: key, merchantName: item.product.merchantName, items: [], amountCents: 0 }
    group.items.push({
      productId: item.productId,
      merchantId: key,
      name: item.product.name,
      unitAmount: item.product.priceCents,
      quantity: item.quantity,
    })
    group.amountCents += item.subtotalCents
    groups.set(key, group)
  }
  return [...groups.values()]
}

function mapLinkStatus(linkStatus: string): string {
  if (linkStatus === 'approved') return 'approved'
  if (['declined', 'canceled', 'cancelled', 'expired'].includes(linkStatus)) return 'failed'
  return 'pending'
}

async function fetchMerchantDetails(merchantIds: string[], db: SupabaseClient): Promise<Map<string, MerchantDetail>> {
  const uniqueIds = [...new Set(merchantIds)]
  if (uniqueIds.length === 0) return new Map()
  const { data, error } = await db.from('merchants').select('id, slug, name, website_url').in('id', uniqueIds)
  if (error) throw new Error('Could not load merchant details')
  return new Map(
    ((data ?? []) as Array<{ id: string; slug: string; name: string; website_url: string | null }>).map((row) => [
      row.id,
      { slug: row.slug, name: row.name, websiteUrl: row.website_url },
    ]),
  )
}

async function findCheckoutSessionRow(cartId: string, guestId: string, db: SupabaseClient): Promise<CheckoutSessionRow | null> {
  const { data, error } = await db
    .from('checkout_sessions')
    .select('id, cart_id, status, total_cents, currency')
    .eq('cart_id', cartId)
    .eq('guest_session_id', guestId)
    .eq('client_request_id', CHECKOUT_CLIENT_REQUEST_ID)
    .maybeSingle()
  if (error) throw new Error('Could not look up checkout session')
  return data as CheckoutSessionRow | null
}

async function findLatestCheckoutSessionForBoard(guestId: string, boardId: string, db: SupabaseClient): Promise<CheckoutSessionRow | null> {
  await assertBoardOwnership(guestId, boardId, db)
  const { data: carts, error } = await db.from('carts').select('id').eq('board_id', boardId).eq('guest_session_id', guestId).order('created_at', { ascending: false })
  if (error) throw new Error('Could not look up board carts')
  for (const cart of (carts ?? []) as Array<{ id: string }>) {
    const session = await findCheckoutSessionRow(cart.id, guestId, db)
    if (session) return session
  }
  return null
}

async function createCheckoutSessionRow(guestId: string, cart: Cart, db: SupabaseClient): Promise<CheckoutSessionRow> {
  const { data, error } = await db
    .from('checkout_sessions')
    .insert({
      cart_id: cart.id,
      guest_session_id: guestId,
      client_request_id: CHECKOUT_CLIENT_REQUEST_ID,
      mode: 'test',
      status: 'awaiting_approval',
      total_cents: cart.totalCents,
      currency: cart.currency,
    })
    .select('id, cart_id, status, total_cents, currency')
    .single()
  if (error || !data) throw new Error('Could not start checkout')
  return data as CheckoutSessionRow
}

async function listMerchantOrderRows(checkoutSessionId: string, db: SupabaseClient): Promise<MerchantOrderRow[]> {
  const { data, error } = await db
    .from('merchant_orders')
    .select('id, merchant_id, link_spend_request_id, external_order_id, amount_cents, currency, status, payment_status, error_message, payment_method_type, link_verified')
    .eq('checkout_session_id', checkoutSessionId)
  if (error) throw new Error('Could not load merchant orders')
  return (data ?? []) as MerchantOrderRow[]
}

async function findMerchantOrderRow(checkoutSessionId: string, merchantId: string, db: SupabaseClient): Promise<MerchantOrderRow | null> {
  const { data, error } = await db
    .from('merchant_orders')
    .select('id, merchant_id, link_spend_request_id, external_order_id, amount_cents, currency, status, payment_status, error_message, payment_method_type, link_verified')
    .eq('checkout_session_id', checkoutSessionId)
    .eq('merchant_id', merchantId)
    .maybeSingle()
  if (error) throw new Error('Could not look up merchant order')
  return data as MerchantOrderRow | null
}

async function createMerchantOrderRow(
  checkoutSessionId: string,
  group: CheckoutGroup,
  currency: string,
  approval: LinkApproval | null,
  db: SupabaseClient,
): Promise<MerchantOrderRow> {
  const status = approval ? mapLinkStatus(approval.status) : 'pending'
  const { data, error } = await db
    .from('merchant_orders')
    .insert({
      checkout_session_id: checkoutSessionId,
      merchant_id: group.merchantId,
      link_spend_request_id: approval?.id ?? null,
      idempotency_key: `${checkoutSessionId}:${group.merchantId}`,
      amount_cents: group.amountCents,
      currency,
      status,
      payment_status: 'not_started',
      error_message: status === 'failed' ? 'Link approval was not granted' : null,
    })
    .select('id, merchant_id, link_spend_request_id, external_order_id, amount_cents, currency, status, payment_status, error_message, payment_method_type, link_verified')
    .single()
  if (error || !data) throw new Error('Could not create merchant order')
  return data as MerchantOrderRow
}

async function updateMerchantOrderRow(id: string, patch: Record<string, unknown>, db: SupabaseClient): Promise<void> {
  const { error } = await db.from('merchant_orders').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error('Could not update merchant order')
}

async function createOrderItemRows(merchantOrderId: string, items: DemoItem[], currency: string, db: SupabaseClient): Promise<void> {
  const rows = items.map((item) => ({
    merchant_order_id: merchantOrderId,
    product_id: item.productId,
    product_name: item.name,
    quantity: item.quantity,
    unit_amount_cents: item.unitAmount,
    currency,
  }))
  const { error } = await db.from('order_items').insert(rows)
  if (error) throw new Error('Could not save order items')
}

async function loadOrderItems(order: MerchantOrderRow, db: SupabaseClient): Promise<DemoItem[]> {
  const { data, error } = await db.from('order_items')
    .select('product_id, product_name, quantity, unit_amount_cents, currency')
    .eq('merchant_order_id', order.id)
  if (error) throw new Error('Could not load checkout item snapshot')
  const items = ((data ?? []) as Array<{ product_id: string; product_name: string; quantity: number; unit_amount_cents: number; currency: string }>).map((row) => {
    if (row.currency !== order.currency || !row.product_id) throw new Error('Checkout item snapshot is invalid')
    return { productId: row.product_id, merchantId: order.merchant_id, name: row.product_name,
      unitAmount: row.unit_amount_cents, quantity: row.quantity }
  })
  if (items.length === 0 || items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0) !== order.amount_cents) {
    throw new Error('Checkout item snapshot does not match merchant total')
  }
  return items
}

function deriveCheckoutStatus(orders: CheckoutMerchantOrder[]): string {
  if (orders.length === 0) return 'awaiting_approval'
  if (orders.every((order) => order.paymentStatus === 'paid')) return 'completed'
  if (orders.some((order) => order.paymentStatus === 'paid')) return 'partial'
  if (orders.some((order) => order.status === 'failed')) return 'failed'
  const settled = ['approved', 'submitted', 'confirmed']
  if (orders.every((order) => settled.includes(order.status))) return 'approved'
  if (orders.some((order) => settled.includes(order.status))) return 'partial'
  return 'awaiting_approval'
}

async function buildCheckout(session: CheckoutSessionRow, boardId: string, db: SupabaseClient): Promise<Checkout> {
  const rows = await listMerchantOrderRows(session.id, db)
  const merchantDetails = await fetchMerchantDetails(rows.map((row) => row.merchant_id), db)
  const merchantOrders: CheckoutMerchantOrder[] = rows.map((row) => ({
    id: row.id,
    merchantId: row.merchant_id,
    merchantName: merchantDetails.get(row.merchant_id)?.name ?? 'Unknown merchant',
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethodType: row.payment_method_type ?? null,
    linkVerified: row.link_verified ?? false,
    errorMessage: row.error_message,
  }))
  const status = deriveCheckoutStatus(merchantOrders)
  if (status !== session.status) {
    const { error } = await db.from('checkout_sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', session.id)
    if (error) throw new Error('Could not update checkout session status')
  }
  return {
    id: session.id,
    boardId,
    cartId: session.cart_id,
    status,
    totalCents: session.total_cents,
    currency: session.currency,
    approvalMode: rows.some((row) => row.link_spend_request_id) ? 'link_cli' : 'hosted_checkout',
    merchantOrders,
  }
}

export async function startCheckout(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
  { authorizer = defaultAuthorizer() }: { authorizer?: ReturnType<typeof createLinkAuthorizer> | null } = {},
): Promise<Checkout> {
  const cart = await getCart(guestId, boardId, db)
  if (cart.items.length === 0) throw validationError('Cannot check out an empty cart')

  let session = await findCheckoutSessionRow(cart.id, guestId, db)
  if (!session) {
    session = await createCheckoutSessionRow(guestId, cart, db)
    const { error } = await db.from('carts').update({ status: 'checkout', updated_at: new Date().toISOString() }).eq('id', cart.id)
    if (error) throw new Error('Could not lock cart for checkout')
  }

  const groups = groupCartForCheckout(cart)
  const merchantDetails = await fetchMerchantDetails(groups.map((group) => group.merchantId), db)

  for (const group of groups) {
    if (await findMerchantOrderRow(session.id, group.merchantId, db)) continue
    const merchant = merchantDetails.get(group.merchantId)
    if (!merchant) throw new Error(`Unknown merchant ${group.merchantId}`)
    const approval = authorizer ? await authorizer.requestApproval({
      checkoutId: session.id,
      merchantId: group.merchantId,
      merchantName: merchant.name,
      merchantUrl: merchant.websiteUrl ?? 'https://example.com',
      amount: group.amountCents,
      currency: cart.currency,
      items: group.items,
    }) : null
    const order = await createMerchantOrderRow(session.id, group, cart.currency, approval, db)
    await createOrderItemRows(order.id, group.items, cart.currency, db)
  }

  return buildCheckout(session, boardId, db)
}

export async function getCheckout(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
  { authorizer = defaultAuthorizer() }: { authorizer?: ReturnType<typeof createLinkAuthorizer> | null } = {},
): Promise<Checkout | null> {
  const session = await findLatestCheckoutSessionForBoard(guestId, boardId, db)
  if (!session) return null

  const orders = await listMerchantOrderRows(session.id, db)
  for (const order of orders) {
    if (!authorizer || !order.link_spend_request_id || order.external_order_id || order.payment_status === 'paid') continue
    const refreshed = await authorizer.getStatus({
      id: order.link_spend_request_id,
      merchantId: order.merchant_id,
      amount: order.amount_cents,
      currency: order.currency,
      status: order.status,
      approvalUrl: null,
    })
    const status = mapLinkStatus(refreshed.status)
    if (status !== order.status) {
      await updateMerchantOrderRow(order.id, { status, error_message: status === 'failed' ? 'Link approval was not granted' : null }, db)
    }
  }

  return buildCheckout(session, boardId, db)
}

export async function preparePayments(
  guestId: string,
  boardId: string,
  baseUrl: string,
  db: SupabaseClient = getSupabaseAdmin(),
  {
    paymentStores = createStripePaymentStores({ keys: STRIPE_KEYS_BY_MERCHANT_SLUG }),
    authorizer = defaultAuthorizer(),
  }: {
    paymentStores?: ReturnType<typeof createStripePaymentStores>
    authorizer?: ReturnType<typeof createLinkAuthorizer> | null
  } = {},
): Promise<Checkout> {
  const checkout = await getCheckout(guestId, boardId, db, { authorizer })
  if (!checkout) throw new Error('Checkout not started')
  const orders = await listMerchantOrderRows(checkout.id, db)
  if (orders.length === 0 || orders.reduce((sum, order) => sum + order.amount_cents, 0) !== checkout.totalCents ||
    orders.some((order) => order.link_spend_request_id && !['approved', 'submitted', 'confirmed'].includes(order.status) &&
      !(order.status === 'failed' && order.payment_status === 'failed' && order.external_order_id)) ||
    orders.some((order) => !order.link_spend_request_id && !['pending', 'submitted', 'confirmed'].includes(order.status) &&
      !(order.status === 'failed' && order.payment_status === 'failed' && order.external_order_id))) {
    throw Object.assign(new Error('All merchant orders must be ready before payment'), { code: 'APPROVAL_REQUIRED' })
  }
  if (checkout.status === 'completed') return checkout

  const merchantDetails = await fetchMerchantDetails(orders.map((order) => order.merchant_id), db)
  if (merchantDetails.size !== orders.length) throw new Error('Checkout merchant is missing')
  await paymentStores.verifyDistinctAccounts(orders.map((order) => merchantDetails.get(order.merchant_id)!.slug))
  const urlByMerchant = new Map<string, string>()
  for (const order of orders) {
    if (order.payment_status === 'paid') continue
    const merchant = merchantDetails.get(order.merchant_id)
    if (!merchant) throw new Error('Checkout merchant is missing')
    const { accountId } = await paymentStores.accountFor(merchant.slug)
    if (order.external_order_id && order.status !== 'failed') {
      const existing = await paymentStores.verifySession({
        id: order.external_order_id, merchantId: merchant.slug, accountId,
        amount: order.amount_cents, currency: order.currency, url: '', status: order.status,
        paymentStatus: order.payment_status, approvalId: order.link_spend_request_id ?? '',
      }, checkout.id)
      if (existing.paymentStatus === 'paid') {
        await updateMerchantOrderRow(order.id, {
          status: 'confirmed', payment_status: 'paid', payment_method_type: existing.paymentMethodType ?? null,
          link_verified: existing.verified === true, error_message: null,
        }, db)
        continue
      }
      if (existing.status !== 'expired') {
        if (!existing.url) throw new Error('Stripe Checkout Session has no resume URL')
        urlByMerchant.set(order.merchant_id, existing.url)
        continue
      }
    }
    const items = await loadOrderItems(order, db)
    // Idempotency-keyed on the merchant order: safe to call every time (even
    // on resume) without creating a duplicate Stripe Checkout Session.
    const session = await paymentStores.createSession({
      checkoutId: checkout.id,
      cartId: checkout.cartId,
      merchantId: merchant.slug,
      items,
      amount: order.amount_cents,
      currency: order.currency,
      approvalId: order.link_spend_request_id ?? '',
      baseUrl,
      returnPath: `/boards/${encodeURIComponent(boardId)}`,
      retryOf: order.external_order_id ?? undefined,
    })
    await updateMerchantOrderRow(order.id, {
      external_order_id: session.id, status: 'submitted', payment_status: 'not_started', error_message: null,
    }, db)
    urlByMerchant.set(order.merchant_id, session.url)
  }

  const result = await buildCheckout({ id: checkout.id, cart_id: checkout.cartId, status: checkout.status, total_cents: checkout.totalCents, currency: checkout.currency }, boardId, db)
  result.merchantOrders = result.merchantOrders.map((order) => ({ ...order, checkoutUrl: urlByMerchant.get(order.merchantId) ?? null }))
  return result
}

export async function refreshPayments(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
  { paymentStores = createStripePaymentStores({ keys: STRIPE_KEYS_BY_MERCHANT_SLUG }) }: {
    paymentStores?: ReturnType<typeof createStripePaymentStores>
  } = {},
): Promise<Checkout | null> {
  const session = await findLatestCheckoutSessionForBoard(guestId, boardId, db)
  if (!session) return null

  const orders = await listMerchantOrderRows(session.id, db)
  const merchantDetails = await fetchMerchantDetails(orders.map((order) => order.merchant_id), db)

  for (const order of orders) {
    if (!order.external_order_id || order.payment_status === 'paid') continue
    const merchant = merchantDetails.get(order.merchant_id)
    if (!merchant) continue
    const { accountId } = await paymentStores.accountFor(merchant.slug)
    try {
      const payment = await paymentStores.verifySession(
        {
          id: order.external_order_id,
          merchantId: merchant.slug,
          accountId,
          amount: order.amount_cents,
          currency: order.currency,
          url: '',
          status: order.status,
          paymentStatus: order.payment_status,
          approvalId: order.link_spend_request_id ?? '',
        },
        session.id,
      )
      if (payment.paymentStatus === 'paid') {
        await updateMerchantOrderRow(order.id, {
          status: 'confirmed', payment_status: 'paid', payment_method_type: payment.paymentMethodType ?? null,
          link_verified: payment.verified === true, error_message: null,
        }, db)
      } else if (payment.status === 'expired') {
        await updateMerchantOrderRow(order.id, {
          status: 'failed', payment_status: 'failed', error_message: 'Stripe Checkout Session expired; payment can be retried',
        }, db)
      } else if (order.error_message) {
        await updateMerchantOrderRow(order.id, { error_message: null }, db)
      }
    } catch {
      await updateMerchantOrderRow(order.id, { error_message: 'Could not verify this merchant payment; retry status refresh' }, db)
    }
  }

  const result = await buildCheckout(session, boardId, db)
  if (result.status === 'completed') {
    const { error } = await db.from('carts').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', session.cart_id)
    if (error) throw new Error('Could not complete cart')
  }
  return result
}
