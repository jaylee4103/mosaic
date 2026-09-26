import { withDemoCheckout } from '@/lib/server/demo-api'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return withDemoCheckout(request, async (checkout) => ({ data: await checkout.complete() }))
}
