import { deleteBoard, getBoard, updateBoard } from '@/lib/server/boards'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function GET(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const board = await getBoard(guest.id, boardId)
    return json(board, 200, guest)
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
    const board = await updateBoard(guest.id, boardId, { name: body?.name })
    return json(board, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function DELETE(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    await deleteBoard(guest.id, boardId)
    return json({ ok: true }, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
