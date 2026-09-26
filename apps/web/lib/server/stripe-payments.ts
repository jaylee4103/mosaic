import { merchants, type DemoItem } from './demo-cart'

type StripeRequest = (
  key: string,
  path: string,
  options?: { params?: URLSearchParams; idempotencyKey?: string },
) => Promise<unknown>

type StripeAccount = { id?: string }
type StripeCheckoutSession = {
  id?: string
  livemode?: boolean
  amount_total?: number
  currency?: string
  client_reference_id?: string
  metadata?: Record<string, string>
  url?: string
  status?: string
  payment_status?: string
  payment_intent?: string | { id?: string }
}
type StripePaymentIntent = {
  id?: string
  livemode?: boolean
  status?: string
  amount_received?: number
  currency?: string
  payment_method?: string | { id?: string }
  metadata?: Record<string, string>
}
type StripePaymentMethod = { type?: string; livemode?: boolean }

export type DemoPayment = {
  id: string
  merchantId: string
  accountId: string
  amount: number
  currency: string
  url: string
  status: string
  paymentStatus: string
  approvalId: string
  paymentIntentId?: string
  paymentMethodType?: string
  verified?: boolean
}

function testKey(value: string | undefined, merchantId: string): string {
  if (!value?.startsWith('sk_test_')) throw new Error(`A Stripe test secret key is required for ${merchantId}`)
  return value
}

export function createStripeApi(fetchImpl: typeof fetch = fetch): StripeRequest {
  return async (key, path, { params, idempotencyKey } = {}) => {
    const url = new URL(`https://api.stripe.com/v1/${path}`)
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    const options: RequestInit = { headers, cache: 'no-store' }
    if (params) {
      options.method = 'POST'
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      options.body = params.toString()
    }
    const response = await fetchImpl(url, options)
    const body = await response.json() as { error?: { message?: string } }
    if (!response.ok) throw new Error(`Stripe ${response.status}: ${body.error?.message ?? 'request failed'}`)
    return body
  }
}

export function createStripePaymentStores({
  keys = {
    'store-a': process.env.STRIPE_STORE_A_TEST_SECRET_KEY,
    'store-b': process.env.STRIPE_STORE_B_TEST_SECRET_KEY,
  } as Record<string, string | undefined>,
  request = createStripeApi(),
}: { keys?: Record<string, string | undefined>; request?: StripeRequest } = {}) {
  const accounts = new Map<string, string>()

  async function accountFor(merchantId: string) {
    const key = testKey(keys[merchantId], merchantId)
    if (!accounts.has(merchantId)) {
      const account = await request(key, 'account') as StripeAccount
      if (!account.id?.startsWith('acct_')) throw new Error(`Stripe account unavailable for ${merchantId}`)
      accounts.set(merchantId, account.id)
    }
    return { key, accountId: accounts.get(merchantId)! }
  }

  return {
    async verifyDistinctAccounts() {
      const ids = await Promise.all(merchants.map(({ id }) => accountFor(id).then(({ accountId }) => accountId)))
      if (new Set(ids).size !== ids.length) throw new Error('Store A and Store B must use distinct Stripe accounts')
    },
    async createSession(input: {
      checkoutId: string
      cartId: string
      merchantId: string
      items: DemoItem[]
      amount: number
      currency: string
      approvalId: string
      baseUrl: string
    }): Promise<DemoPayment> {
      const { checkoutId, cartId, merchantId, items, amount, currency, approvalId, baseUrl } = input
      const { key, accountId } = await accountFor(merchantId)
      const params = new URLSearchParams({
        mode: 'payment',
        client_reference_id: checkoutId,
        success_url: `${baseUrl}/api/demo/checkout/return?merchant=${merchantId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/demo/checkout/return?merchant=${merchantId}&canceled=1`,
        'metadata[mosaic_checkout_id]': checkoutId,
        'metadata[mosaic_cart_id]': cartId,
        'metadata[mosaic_merchant_id]': merchantId,
        'metadata[link_approval_id]': approvalId,
        'payment_intent_data[metadata][mosaic_checkout_id]': checkoutId,
        'payment_intent_data[metadata][mosaic_merchant_id]': merchantId,
        'payment_method_types[0]': 'card',
        'payment_method_types[1]': 'link',
      })
      items.forEach((item, index) => {
        params.set(`line_items[${index}][price_data][currency]`, currency)
        params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount))
        params.set(`line_items[${index}][price_data][product_data][name]`, item.name)
        params.set(`line_items[${index}][quantity]`, String(item.quantity))
      })
      const session = await request(key, 'checkout/sessions', {
        params,
        idempotencyKey: `mosaic:${checkoutId}:${merchantId}:checkout`,
      }) as StripeCheckoutSession
      if (session.livemode !== false || !session.id?.startsWith('cs_test_') ||
        session.amount_total !== amount || session.currency !== currency ||
        session.client_reference_id !== checkoutId || session.metadata?.mosaic_merchant_id !== merchantId ||
        !session.url?.startsWith('https://checkout.stripe.com/')) {
        throw new Error(`Stripe test Checkout Session does not match ${merchantId}`)
      }
      return { id: session.id, merchantId, accountId, amount, currency, url: session.url,
        status: 'awaiting_customer', paymentStatus: 'unpaid', approvalId }
    },
    async verifySession(payment: DemoPayment, checkoutId: string): Promise<DemoPayment> {
      const { key, accountId } = await accountFor(payment.merchantId)
      if (accountId !== payment.accountId) throw new Error(`Stripe account changed for ${payment.merchantId}`)
      const session = await request(key, `checkout/sessions/${encodeURIComponent(payment.id)}`) as StripeCheckoutSession
      if (session.livemode !== false || session.id !== payment.id ||
        session.amount_total !== payment.amount || session.currency !== payment.currency ||
        session.client_reference_id !== checkoutId || session.metadata?.mosaic_checkout_id !== checkoutId ||
        session.metadata?.mosaic_merchant_id !== payment.merchantId) {
        throw new Error(`Stripe Checkout Session does not match ${payment.merchantId}`)
      }
      if (session.status !== 'complete' || session.payment_status !== 'paid' || !session.payment_intent) {
        return { ...payment, status: session.status ?? 'unknown', paymentStatus: session.payment_status ?? 'unknown', verified: false }
      }
      const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
      if (!intentId) throw new Error(`Stripe PaymentIntent missing for ${payment.merchantId}`)
      const intent = await request(key, `payment_intents/${encodeURIComponent(intentId)}`) as StripePaymentIntent
      const methodId = typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id
      if (intent.livemode !== false || intent.status !== 'succeeded' ||
        intent.amount_received !== payment.amount || intent.currency !== payment.currency || !methodId ||
        intent.metadata?.mosaic_checkout_id !== checkoutId || intent.metadata?.mosaic_merchant_id !== payment.merchantId) {
        throw new Error(`Stripe PaymentIntent does not match ${payment.merchantId}`)
      }
      const method = await request(key, `payment_methods/${encodeURIComponent(methodId)}`) as StripePaymentMethod
      return { ...payment, status: 'complete', paymentStatus: 'paid', paymentIntentId: intent.id,
        paymentMethodType: method.type, verified: method.type === 'link' && method.livemode === false }
    },
  }
}
