import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'
import { getVibeProfile, saveVibeProfile } from '@/lib/server/vibe-profile'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function GET(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const profile = await getVibeProfile(guest.id, boardId)
    return json(profile, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function PUT(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const body = await request.json().catch(() => null)
    const profile = await saveVibeProfile(guest.id, boardId, body)
    return json(profile, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
