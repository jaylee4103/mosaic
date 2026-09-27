import { expect, test } from 'bun:test'
import { addCartItem } from '../lib/server/cart'
import { createBoard } from '../lib/server/boards'
import { getCheckout, preparePayments, refreshPayments, startCheckout } from '../lib/server/checkout'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const OTHER_GUEST_ID = 'guest-2'
const MERCHANT_A = { id: 'merchant-a', slug: 'sol-and-clay', name: 'Sol & Clay', website_url: 'https://example.com' }
const MERCHANT_B = { id: 'merchant-b', slug: 'north-loom', name: 'North Loom', website_url: 'https://example.org' }
const LAMP = {
  id: 'product-lamp', merchant_id: 'merchant-a', name: 'Ceramic Bedside Lamp', description: null,
  category: 'lighting', price_cents: 5500, currency: 'usd', image_url: null, product_url: null, available: true,
}
const RUG = {
  id: 'product-rug', merchant_id: 'merchant-b', name: 'Woven Jute Rug', description: null,
  category: 'textiles', price_cents: 12000, currency: 'usd', image_url: null, product_url: null, available: true,
}

type FakeApproval = { id: string; merchantId: string; amount: number; currency: string; status: string; approvalUrl: string | null }

function createFakeAuthorizer(statusByMerchant: Map<string, string>) {
  const created: Array<{ merchantId: string; amount: number }> = []
  let counter = 0
  return {
    created,
    async requestApproval(input: { merchantId: string; amount: number; currency: string }): Promise<FakeApproval> {
      created.push({ merchantId: input.merchantId, amount: input.amount })
      return {
        id: `lsrq_${input.merchantId}_${counter++}`,
        merchantId: input.merchantId,
        amount: input.amount,
        currency: input.currency,
        status: statusByMerchant.get(input.merchantId) ?? 'pending_approval',
        approvalUrl: null,
      }
    },
    async getStatus(request: FakeApproval): Promise<FakeApproval> {
      return { ...request, status: statusByMerchant.get(request.merchantId) ?? 'pending_approval' }
    },
  }
}

type FakeSession = {
  id: string; merchantId: string; accountId: string; amount: number; currency: string
  url: string; status: string; paymentStatus: string; approvalId: string
  paymentMethodType?: string; verified?: boolean
}

function createFakePaymentStores() {
  const sessions = new Map<string, FakeSession>()
  const returnPaths: string[] = []
  const byAttempt = new Map<string, FakeSession>()
  const verificationFailures = new Set<string>()
  let counter = 0
  return {
    sessions,
    returnPaths,
    verificationFailures,
    async verifyDistinctAccounts() {},
    async accountFor(merchantId: string) {
      return { key: `key_${merchantId}`, accountId: `acct_${merchantId}` }
    },
    async createSession(input: { merchantId: string; amount: number; currency: string; approvalId: string; returnPath?: string; retryOf?: string }): Promise<FakeSession> {
      if (input.returnPath) returnPaths.push(input.returnPath)
      const attemptKey = `${input.merchantId}:${input.retryOf ?? 'initial'}`
      const existing = byAttempt.get(attemptKey)
      if (existing) return existing
      const id = `cs_test_${input.merchantId}_${counter++}`
      const session: FakeSession = {
        id, merchantId: input.merchantId, accountId: `acct_${input.merchantId}`, amount: input.amount,
        currency: input.currency, url: `https://checkout.stripe.com/test/${id}`, status: 'open',
        paymentStatus: 'unpaid', approvalId: input.approvalId,
      }
      sessions.set(id, session)
      byAttempt.set(attemptKey, session)
      return session
    },
    async verifySession(payment: { id: string }): Promise<FakeSession> {
      const session = sessions.get(payment.id)
      if (!session) throw new Error('Unknown Stripe session')
      if (verificationFailures.has(session.merchantId)) throw new Error('Temporary Stripe error')
      return session
    },
    markPaid(sessionId: string, paymentMethodType = 'link') {
      const session = sessions.get(sessionId)
      if (session) {
        session.status = 'complete'
        session.paymentStatus = 'paid'
        session.paymentMethodType = paymentMethodType
        session.verified = paymentMethodType === 'link'
      }
    },
    markExpired(sessionId: string) {
      const session = sessions.get(sessionId)
      if (session) session.status = 'expired'
    },
  }
}

async function seedBoardWithCart(guestId = GUEST_ID) {
  const { client, tables } = createFakeSupabase({ merchants: [MERCHANT_A, MERCHANT_B], products: [LAMP, RUG] })
  const board = await createBoard(guestId, 'Dream Apartment', client)
  await addCartItem(guestId, board.id, { productId: LAMP.id }, client)
  await addCartItem(guestId, board.id, { productId: RUG.id }, client)
  return { client, tables, board }
}

test('startCheckout groups the cart by merchant and requests one Link approval per merchant, idempotently', async () => {
  const { client, board } = await seedBoardWithCart()
  const authorizer = createFakeAuthorizer(new Map())

  const first = await startCheckout(GUEST_ID, board.id, client, { authorizer })
  expect(first.merchantOrders).toHaveLength(2)
  expect(authorizer.created).toHaveLength(2)
  expect(first.merchantOrders.map((o) => o.amountCents).sort((a, b) => a - b)).toEqual([5500, 12000])

  const second = await startCheckout(GUEST_ID, board.id, client, { authorizer })
  expect(authorizer.created).toHaveLength(2) // no duplicate Link requests on re-call
  expect(second.merchantOrders).toHaveLength(2)
})

test('startCheckout rejects an empty cart', async () => {
  const { client } = createFakeSupabase({ merchants: [MERCHANT_A], products: [LAMP] })
  const board = await createBoard(GUEST_ID, 'Empty Board', client)
  await expect(startCheckout(GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'VALIDATION' })
})

test('getCheckout refreshes Link status and derives the overall checkout status', async () => {
  const { client, board } = await seedBoardWithCart()
  const statusByMerchant = new Map([[MERCHANT_A.id, 'pending_approval'], [MERCHANT_B.id, 'pending_approval']])
  const authorizer = createFakeAuthorizer(statusByMerchant)
  await startCheckout(GUEST_ID, board.id, client, { authorizer })

  let checkout = await getCheckout(GUEST_ID, board.id, client, { authorizer })
  expect(checkout?.status).toBe('awaiting_approval')

  statusByMerchant.set(MERCHANT_A.id, 'approved')
  checkout = await getCheckout(GUEST_ID, board.id, client, { authorizer })
  expect(checkout?.status).toBe('partial')

  statusByMerchant.set(MERCHANT_B.id, 'approved')
  checkout = await getCheckout(GUEST_ID, board.id, client, { authorizer })
  expect(checkout?.status).toBe('approved')
})

test('getCheckout returns null when checkout has not started', async () => {
  const { client, board } = await seedBoardWithCart()
  const checkout = await getCheckout(GUEST_ID, board.id, client)
  expect(checkout).toBeNull()
})

test('preparePayments requires every merchant to be approved first', async () => {
  const { client, board } = await seedBoardWithCart()
  const authorizer = createFakeAuthorizer(new Map([[MERCHANT_A.id, 'approved']]))
  await startCheckout(GUEST_ID, board.id, client, { authorizer })

  const paymentStores = createFakePaymentStores()
  await expect(
    preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer }),
  ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' })
})

test('preparePayments creates one Stripe session per merchant once all are approved, and refreshPayments completes the order', async () => {
  const { client, board, tables } = await seedBoardWithCart()
  const authorizer = createFakeAuthorizer(new Map([[MERCHANT_A.id, 'approved'], [MERCHANT_B.id, 'approved']]))
  await startCheckout(GUEST_ID, board.id, client, { authorizer })

  const paymentStores = createFakePaymentStores()
  const prepared = await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer })
  expect(prepared.merchantOrders.every((o) => o.checkoutUrl?.startsWith('https://checkout.stripe.com/'))).toBe(true)
  expect(prepared.status).toBe('approved') // submitted counts as "settled" but not yet paid

  for (const session of paymentStores.sessions.values()) paymentStores.markPaid(session.id)

  const refreshed = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(refreshed?.status).toBe('completed')
  expect(refreshed?.merchantOrders.every((o) => o.paymentStatus === 'paid')).toBe(true)
  expect(refreshed?.merchantOrders.every((o) => o.linkVerified)).toBe(true)
  expect(tables.carts[0].status).toBe('completed')
  expect(await getCheckout(GUEST_ID, board.id, client, { authorizer })).toMatchObject({ id: refreshed?.id, status: 'completed' })
  expect(tables.order_items).toHaveLength(2)
})

test('hosted checkout works without the local Link CLI and retains the original price snapshot', async () => {
  const { client, board, tables } = await seedBoardWithCart()
  const checkout = await startCheckout(GUEST_ID, board.id, client, { authorizer: null })
  expect(checkout.approvalMode).toBe('hosted_checkout')
  expect(checkout.merchantOrders.every((order) => order.status === 'pending')).toBe(true)

  tables.products[0].price_cents = 9900
  const paymentStores = createFakePaymentStores()
  const prepared = await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  expect([...paymentStores.sessions.values()].find((session) => session.merchantId === MERCHANT_A.slug)?.amount).toBe(5500)
  expect(paymentStores.returnPaths).toEqual([`/boards/${board.id}`, `/boards/${board.id}`])
  expect(prepared.totalCents).toBe(17500)
})

test('one paid store remains partial and the unpaid store can resume its payment URL', async () => {
  const { client, board } = await seedBoardWithCart()
  await startCheckout(GUEST_ID, board.id, client, { authorizer: null })
  const paymentStores = createFakePaymentStores()
  await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  const firstSession = [...paymentStores.sessions.values()][0]
  paymentStores.markPaid(firstSession.id)

  const partial = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(partial?.status).toBe('partial')
  const resumed = await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  expect(resumed.merchantOrders.filter((order) => order.checkoutUrl)).toHaveLength(1)
  expect(paymentStores.sessions.size).toBe(2)
})

test('an expired store session can be retried without charging the already paid store again', async () => {
  const { client, board } = await seedBoardWithCart()
  await startCheckout(GUEST_ID, board.id, client, { authorizer: null })
  const paymentStores = createFakePaymentStores()
  await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  const sessions = [...paymentStores.sessions.values()]
  paymentStores.markPaid(sessions[0].id)
  paymentStores.markExpired(sessions[1].id)
  const partial = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(partial?.status).toBe('partial')
  expect(partial?.merchantOrders.find((order) => order.merchantId === MERCHANT_B.id)?.paymentStatus).toBe('failed')

  const retried = await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  expect(retried.merchantOrders.filter((order) => order.checkoutUrl)).toHaveLength(1)
  expect(paymentStores.sessions.size).toBe(3)
  const retrySession = [...paymentStores.sessions.values()][2]
  paymentStores.markPaid(retrySession.id)
  const completed = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(completed?.status).toBe('completed')
})

test('a transient verification error for one store does not hide the other store payment', async () => {
  const { client, board } = await seedBoardWithCart()
  await startCheckout(GUEST_ID, board.id, client, { authorizer: null })
  const paymentStores = createFakePaymentStores()
  await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  const sessions = [...paymentStores.sessions.values()]
  for (const session of sessions) paymentStores.markPaid(session.id)
  paymentStores.verificationFailures.add(sessions[1].merchantId)
  const partial = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(partial?.status).toBe('partial')
  expect(partial?.merchantOrders.find((order) => order.merchantId === MERCHANT_B.id)?.errorMessage).toContain('retry')

  paymentStores.verificationFailures.clear()
  const completed = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(completed?.status).toBe('completed')
})

test('a paid card is recorded accurately without claiming it was a Link payment', async () => {
  const { client, board } = await seedBoardWithCart()
  await startCheckout(GUEST_ID, board.id, client, { authorizer: null })
  const paymentStores = createFakePaymentStores()
  await preparePayments(GUEST_ID, board.id, 'http://127.0.0.1:3000', client, { paymentStores, authorizer: null })
  for (const session of paymentStores.sessions.values()) paymentStores.markPaid(session.id, 'card')

  const refreshed = await refreshPayments(GUEST_ID, board.id, client, { paymentStores })
  expect(refreshed?.status).toBe('completed')
  expect(refreshed?.merchantOrders.every((order) => order.paymentMethodType === 'card' && !order.linkVerified)).toBe(true)
})

test('the cart is locked once checkout has started', async () => {
  const { client, board } = await seedBoardWithCart()
  await startCheckout(GUEST_ID, board.id, client, { authorizer: createFakeAuthorizer(new Map()) })

  await expect(addCartItem(GUEST_ID, board.id, { productId: LAMP.id }, client)).rejects.toMatchObject({
    code: 'VALIDATION',
  })
})

test('checkout access 404s for a board owned by another guest', async () => {
  const { client, board } = await seedBoardWithCart()
  await expect(startCheckout(OTHER_GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
})
