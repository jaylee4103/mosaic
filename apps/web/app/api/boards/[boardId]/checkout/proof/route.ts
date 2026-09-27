import { listCheckoutProofs } from '@/lib/server/browserCheckout'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function GET(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const proofs = await listCheckoutProofs(guest.id, boardId)
    return json({ proofs }, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
