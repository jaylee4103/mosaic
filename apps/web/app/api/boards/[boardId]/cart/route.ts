import { getCart, setCartBudget } from '@/lib/server/cart'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function GET(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const cart = await getCart(guest.id, boardId)
    return json(cart, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function PATCH(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const body = await request.json().catch(() => null)
    const cart = await setCartBudget(guest.id, boardId, { budgetCents: body?.budgetCents })
    return json(cart, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
