import { getCheckout, startCheckout } from '@/lib/server/checkout'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function POST(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const checkout = await startCheckout(guest.id, boardId)
    return json(checkout, 202, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function GET(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const checkout = await getCheckout(guest.id, boardId)
    if (!checkout) return json({ error: 'Checkout not started', code: 'NOT_FOUND' }, 404, guest)
    return json(checkout, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
