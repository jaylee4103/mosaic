import { withDemoCheckout } from '@/lib/server/demo-api'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return withDemoCheckout(request, async (checkout) => ({ data: await checkout.preparePayments() }))
}

export async function GET(request: Request) {
  return withDemoCheckout(request, async (checkout) => {
    const data = await checkout.refreshPayments()
    return { data: data ?? { error: 'Checkout not started' }, status: data ? 200 : 404 }
  })
}
