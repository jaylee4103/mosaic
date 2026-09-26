import { removeCartItem, updateCartItem } from '@/lib/server/cart'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string; itemId: string }> }

export async function PATCH(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId, itemId } = await params
    const body = await request.json().catch(() => null)
    const cart = await updateCartItem(guest.id, boardId, itemId, {
      quantity: body?.quantity,
      locked: body?.locked,
    })
    return json(cart, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function DELETE(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId, itemId } = await params
    const cart = await removeCartItem(guest.id, boardId, itemId)
    return json(cart, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
