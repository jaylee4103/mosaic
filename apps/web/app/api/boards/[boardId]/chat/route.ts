import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'
import { validationError } from '@/lib/server/errors'
import { runShoppingAgentTurn } from '@/lib/ai/shoppingAgent'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function POST(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const body = await request.json().catch(() => null)
    const userMessage = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : undefined
    if (typeof userMessage !== 'string' || !userMessage.trim()) {
      throw validationError('Request body must be { message: string }')
    }

    const result = await runShoppingAgentTurn({ guestId: guest.id, boardId, userMessage })
    return json(result, 200, guest)
  } catch (error) {
    console.error(`[chat-route] request failed: ${error instanceof Error ? error.stack : String(error)}`)
    return routeError(error, guest)
  }
}
