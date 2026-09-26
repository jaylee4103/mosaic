import { expect, test } from 'bun:test'
import { createDemoCheckoutService } from '../lib/server/demo-checkout'
import type { DemoCheckoutState } from '../lib/server/demo-checkout-types'
import type { DemoSessionStore } from '../lib/server/demo-session-store'
import { createTestStores } from '../lib/server/demo-stores'
import type { LinkApproval } from '../lib/server/link'
import type { DemoPayment } from '../lib/server/stripe-payments'

test('two-store checkout survives separate route instances and only verifies Link payments', async () => {
  let saved: DemoCheckoutState | null = null
  let version: number | null = null
  const store = {
    async load() { return saved === null ? null : { state: structuredClone(saved), version: version! } },
    async save(state: DemoCheckoutState, expected: number | null) {
      if (expected !== version) throw Object.assign(new Error('Conflict'), { code: 'CHECKOUT_CONFLICT' })
      version = version === null ? 0 : version + 1
      saved = structuredClone(state)
      return version
    },
  } satisfies DemoSessionStore
  const authorizer = {
    async requestApproval({ merchantId, amount, currency }: { merchantId: string; amount: number; currency: string }): Promise<LinkApproval> {
      return { id: `lsrq_${merchantId}`, merchantId, amount, currency, status: 'pending_approval', approvalUrl: null }
    },
    async getStatus(request: LinkApproval): Promise<LinkApproval> {
      return { ...request, status: 'approved' }
    },
  }
  const created: Array<{ merchantId: string; amount: number }> = []
  const paymentStores = {
    async verifyDistinctAccounts() {},
    async createSession(input: { checkoutId: string; merchantId: string; amount: number; currency: string; approvalId: string }): Promise<DemoPayment> {
      created.push({ merchantId: input.merchantId, amount: input.amount })
      return { id: `cs_test_${input.merchantId}`, merchantId: input.merchantId,
        accountId: `acct_${input.merchantId}`, amount: input.amount, currency: input.currency,
        approvalId: input.approvalId, url: 'https://checkout.stripe.com/test',
        status: 'awaiting_customer', paymentStatus: 'unpaid' }
    },
    async verifySession(payment: DemoPayment): Promise<DemoPayment> {
      return { ...payment, status: 'complete', paymentStatus: 'paid',
        paymentMethodType: 'link', verified: true }
    },
  }
  const options = { authorizer, testStores: createTestStores(), paymentStores, baseUrl: 'http://127.0.0.1:3000' }

  const first = await createDemoCheckoutService(store, options)
  const started = await first.start()
  expect(started.total).toBe(300)
  expect(started.requests.map(({ amount }) => amount)).toEqual([100, 200])

  const second = await createDemoCheckoutService(store, options)
  expect((await second.complete()).status).toBe('test_orders_created')
  expect((await second.complete()).orders).toHaveLength(2)

  const third = await createDemoCheckoutService(store, options)
  expect((await third.preparePayments()).status).toBe('awaiting_link_test_payments')
  expect((await third.preparePayments()).payments).toHaveLength(2)
  expect(created).toEqual([{ merchantId: 'store-a', amount: 100 }, { merchantId: 'store-b', amount: 200 }])

  const fourth = await createDemoCheckoutService(store, options)
  expect((await fourth.refreshPayments())?.status).toBe('link_test_payments_verified')
})

test('pending approvals cannot create orders or payment sessions', async () => {
  let saved: DemoCheckoutState | null = null
  const store = {
    async load() { return saved ? { state: structuredClone(saved), version: 0 } : null },
    async save(state: DemoCheckoutState) { saved = structuredClone(state); return 0 },
  } satisfies DemoSessionStore
  const authorizer = {
    async requestApproval({ merchantId, amount, currency }: { merchantId: string; amount: number; currency: string }): Promise<LinkApproval> {
      return { id: `lsrq_${merchantId}`, merchantId, amount, currency, status: 'pending_approval', approvalUrl: null }
    },
    async getStatus(request: LinkApproval) { return request },
  }
  let paymentCreates = 0
  const paymentStores = {
    async verifyDistinctAccounts() {},
    async createSession(): Promise<DemoPayment> { paymentCreates++; throw new Error('Should not create payment') },
    async verifySession(payment: DemoPayment) { return payment },
  }
  const checkout = await createDemoCheckoutService(store, {
    authorizer, testStores: createTestStores(), paymentStores, baseUrl: 'http://127.0.0.1:3000',
  })
  await checkout.start()
  await expect(checkout.complete()).rejects.toThrow('Both merchant approvals')
  await expect(checkout.preparePayments()).rejects.toThrow('Both merchant approvals')
  expect(paymentCreates).toBe(0)
})
