import { randomUUID } from 'node:crypto'
import { demoCart, groupCartByMerchant, merchants } from './demo-cart'
import type { DemoCheckout, DemoCheckoutState } from './demo-checkout-types'
import { createTestStores, type DemoOrder } from './demo-stores'
import { createLinkAuthorizer } from './link'
import { createStripePaymentStores } from './stripe-payments'
import { createDemoSessionStore, type DemoSessionStore } from './demo-session-store'

const merchantUrls: Record<string, string> = {
  'store-a': 'https://example.com',
  'store-b': 'https://example.org',
}

const groups = groupCartByMerchant(demoCart)

function checkoutStatus(state: DemoCheckoutState): string {
  if (state.payments.length === groups.length && state.payments.every(({ verified }) => verified)) {
    return 'link_test_payments_verified'
  }
  if (state.payments.some(({ paymentStatus, verified }) => paymentStatus === 'paid' && !verified)) {
    return 'non_link_payment_detected'
  }
  if (state.payments.length) return 'awaiting_link_test_payments'
  if (state.orders.length === groups.length && state.orders.every(({ status }) => status === 'test_order_created')) {
    return 'test_orders_created'
  }
  if (state.orders.length) return 'partial_test_orders'
  if (state.requests.length < groups.length) return 'creating_approvals'
  if (state.requests.some(({ status }) => ['declined', 'canceled', 'cancelled', 'expired'].includes(status))) {
    return 'approval_failed'
  }
  if (state.requests.every(({ status }) => status === 'approved')) return 'approved_for_test_checkout'
  return 'awaiting_approval'
}

function approvalRequired(): Error {
  return Object.assign(new Error('Both merchant approvals must be current and match the cart'), {
    code: 'APPROVAL_REQUIRED',
  })
}

export async function createDemoCheckoutService(
  store: DemoSessionStore,
  {
    authorizer = createLinkAuthorizer(),
    testStores = createTestStores(),
    paymentStores = createStripePaymentStores(),
    baseUrl,
  }: {
    authorizer?: ReturnType<typeof createLinkAuthorizer>
    testStores?: ReturnType<typeof createTestStores>
    paymentStores?: ReturnType<typeof createStripePaymentStores>
    baseUrl?: string
  } = {},
) {
  const stored = await store.load()
  let session: DemoCheckoutState | null = stored?.state ?? null
  let version: number | null = stored?.version ?? null

  async function save() {
    if (!session) throw new Error('Checkout not started')
    version = await store.save(session, version)
  }

  function current(): DemoCheckout | null {
    if (!session) return null
    return {
      ...session,
      status: checkoutStatus(session),
      requests: session.requests.map((request) => ({ ...request })),
      orders: session.orders.map((order) => ({ ...order })),
      payments: session.payments.map((payment) => ({ ...payment })),
    }
  }

  async function start(): Promise<DemoCheckout> {
    if (!session) {
      session = {
        id: `checkout-${randomUUID()}`,
        cartId: demoCart.id,
        currency: demoCart.currency,
        total: groups.reduce((sum, group) => sum + group.amount, 0),
        requests: [],
        orders: [],
        payments: [],
      }
      await save()
    }
    for (const group of groups) {
      if (session.requests.some(({ merchantId }) => merchantId === group.merchantId)) continue
      const merchant = merchants.find(({ id }) => id === group.merchantId)
      if (!merchant) throw new Error(`Unknown merchant ${group.merchantId}`)
      const approval = await authorizer.requestApproval({
        checkoutId: session.id,
        merchantId: merchant.id,
        merchantName: merchant.name,
        merchantUrl: merchantUrls[merchant.id],
        amount: group.amount,
        currency: demoCart.currency,
        items: group.items,
      })
      session.requests.push(approval)
      await save()
    }
    return current()!
  }

  async function refresh(): Promise<DemoCheckout | null> {
    if (!session) return null
    session.requests = await Promise.all(session.requests.map((request) => authorizer.getStatus(request)))
    await save()
    return current()
  }

  function hasApprovals(): boolean {
    return !!session && groups.every(({ merchantId, amount }) => session!.requests.some((request) =>
      request.merchantId === merchantId && request.amount === amount &&
      request.currency === demoCart.currency && request.status === 'approved'))
  }

  async function complete(): Promise<DemoCheckout> {
    if (!session) throw new Error('Checkout not started')
    await refresh()
    if (!hasApprovals()) throw approvalRequired()
    for (const group of groups) {
      if (session.orders.some((order) => order.merchantId === group.merchantId && order.status === 'test_order_created')) continue
      const approval = session.requests.find((request) => request.merchantId === group.merchantId)!
      let order: DemoOrder
      try {
        order = await testStores[group.merchantId].placeOrder({
          checkoutId: session.id,
          cartId: session.cartId,
          ...group,
          currency: session.currency,
          approvalId: approval.id,
        })
      } catch (error) {
        order = { merchantId: group.merchantId, amount: group.amount, currency: session.currency,
          status: 'test_order_failed', error: error instanceof Error ? error.message : 'Test order failed' }
      }
      session.orders = session.orders.filter((existing) => existing.merchantId !== group.merchantId)
      session.orders.push(order)
      await save()
    }
    return current()!
  }

  async function preparePayments(): Promise<DemoCheckout> {
    if (!session) throw new Error('Checkout not started')
    if (!baseUrl) throw new Error('APP_BASE_URL is required for Stripe return URLs')
    await refresh()
    if (!hasApprovals()) throw approvalRequired()
    await paymentStores.verifyDistinctAccounts()
    for (const group of groups) {
      if (session.payments.some((payment) => payment.merchantId === group.merchantId)) continue
      const approval = session.requests.find((request) => request.merchantId === group.merchantId)!
      const payment = await paymentStores.createSession({
        checkoutId: session.id,
        cartId: session.cartId,
        ...group,
        currency: session.currency,
        approvalId: approval.id,
        baseUrl,
      })
      session.payments.push(payment)
      await save()
    }
    return current()!
  }

  async function refreshPayments(): Promise<DemoCheckout | null> {
    if (!session) return null
    session.payments = await Promise.all(session.payments.map((payment) =>
      paymentStores.verifySession(payment, session!.id)))
    await save()
    return current()
  }

  return { current, start, refresh, complete, preparePayments, refreshPayments }
}

export async function checkoutForGuest(guestId: string, baseUrl?: string) {
  return createDemoCheckoutService(createDemoSessionStore(guestId), { baseUrl })
}
