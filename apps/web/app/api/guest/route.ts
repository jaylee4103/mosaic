import { getOrCreateGuest } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const guest = await getOrCreateGuest(request)
    return json({ guestId: guest.id }, 200, guest)
  } catch (error) {
    return routeError(error)
  }
}
