import { checkoutForGuest } from './demo-checkout'
import { getOrCreateGuest, type GuestSession } from './guest-session'
import { json, routeError } from './http'

type Checkout = Awaited<ReturnType<typeof checkoutForGuest>>

export async function withDemoCheckout(
  request: Request,
  action: (checkout: Checkout) => Promise<{ data: unknown; status?: number }>,
): Promise<Response> {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const checkout = await checkoutForGuest(guest.id, process.env.APP_BASE_URL)
    const result = await action(checkout)
    return json(result.data, result.status ?? 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
