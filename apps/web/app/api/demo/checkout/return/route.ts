import { withDemoCheckout } from '@/lib/server/demo-api'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  return withDemoCheckout(request, async (checkout) => {
    const data = await checkout.refreshPayments()
    return {
      data: data ? {
        checkoutId: data.id,
        status: data.status,
        payments: data.payments.map(({ merchantId, amount, currency, paymentStatus, paymentMethodType, verified }) => ({
          merchantId, amount, currency, paymentStatus, paymentMethodType, verified,
        })),
      } : { error: 'Checkout not started' },
      status: data ? 200 : 404,
    }
  })
}
