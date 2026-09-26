import { applyCartActions } from '@/lib/server/cart-actions'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function POST(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const body = await request.json().catch(() => null)
    const outcome = await applyCartActions(guest.id, boardId, body)
    return json(outcome, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
