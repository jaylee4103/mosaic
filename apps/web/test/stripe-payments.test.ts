import { expect, test } from 'bun:test'
import { createStripePaymentStores } from '../lib/server/stripe-payments'

const keys = { 'store-a': 'sk_test_store_a', 'store-b': 'sk_test_store_b' }

test('separate merchant accounts receive exact Stripe test totals', async () => {
  const amounts: number[] = []
  const stores = createStripePaymentStores({
    keys,
    request: async (key, path, options) => {
      const merchantId = key === keys['store-a'] ? 'store-a' : 'store-b'
      const amount = merchantId === 'store-a' ? 100 : 200
      if (path === 'account') return { id: `acct_${merchantId}` }
      if (path === 'checkout/sessions') {
        const params = options?.params
        amounts.push(Number(params?.get('line_items[0][price_data][unit_amount]')))
        expect(params?.get('payment_method_types[1]')).toBe('link')
        return { id: `cs_test_${merchantId}`, livemode: false, amount_total: amount, currency: 'usd',
          client_reference_id: 'checkout-test', metadata: { mosaic_merchant_id: merchantId },
          url: `https://checkout.stripe.com/c/pay/cs_test_${merchantId}` }
      }
      throw new Error(`Unexpected Stripe path ${path}`)
    },
  })
  await stores.verifyDistinctAccounts()
  for (const [merchantId, amount] of [['store-a', 100], ['store-b', 200]] as const) {
    await stores.createSession({ checkoutId: 'checkout-test', cartId: 'cart-demo-1', merchantId,
      items: [{ productId: merchantId, merchantId, name: 'Demo item', unitAmount: amount, quantity: 1 }],
      amount, currency: 'usd', approvalId: `lsrq_${merchantId}`, baseUrl: 'http://127.0.0.1:3000' })
  }
  expect(amounts).toEqual([100, 200])
})

test('a paid card session does not count as a verified Link payment', async () => {
  const stores = createStripePaymentStores({
    keys,
    request: async (_key, path) => {
      if (path === 'account') return { id: 'acct_store-a' }
      if (path === 'checkout/sessions') return { id: 'cs_test_store-a', livemode: false,
        amount_total: 100, currency: 'usd', client_reference_id: 'checkout-test',
        metadata: { mosaic_merchant_id: 'store-a' }, url: 'https://checkout.stripe.com/c/pay/cs_test_store-a' }
      if (path.startsWith('checkout/sessions/')) return { id: 'cs_test_store-a', livemode: false,
        amount_total: 100, currency: 'usd', client_reference_id: 'checkout-test',
        metadata: { mosaic_checkout_id: 'checkout-test', mosaic_merchant_id: 'store-a' },
        status: 'complete', payment_status: 'paid', payment_intent: 'pi_store-a' }
      if (path.startsWith('payment_intents/')) return { id: 'pi_store-a', livemode: false,
        status: 'succeeded', amount_received: 100, currency: 'usd', payment_method: 'pm_store-a',
        metadata: { mosaic_checkout_id: 'checkout-test', mosaic_merchant_id: 'store-a' } }
      if (path.startsWith('payment_methods/')) return { type: 'card', livemode: false }
      throw new Error(`Unexpected Stripe path ${path}`)
    },
  })
  const payment = await stores.createSession({ checkoutId: 'checkout-test', cartId: 'cart-demo-1',
    merchantId: 'store-a', items: [{ productId: 'lamp-a', merchantId: 'store-a', name: 'Demo lamp', unitAmount: 100, quantity: 1 }],
    amount: 100, currency: 'usd', approvalId: 'lsrq_store-a', baseUrl: 'http://127.0.0.1:3000' })
  const result = await stores.verifySession(payment, 'checkout-test')
  expect(result.paymentStatus).toBe('paid')
  expect(result.paymentMethodType).toBe('card')
  expect(result.verified).toBe(false)
})
