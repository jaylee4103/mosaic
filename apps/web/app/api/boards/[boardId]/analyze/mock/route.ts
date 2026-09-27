import { analyzeBoardMock } from '@/lib/server/board-analysis'
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
    const scenario = body && typeof body === 'object' && 'scenario' in body ? body.scenario : null
    const vibeProfile = await analyzeBoardMock(guest.id, boardId, scenario)
    return json({ vibeProfile }, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
