import { createBoard, listBoards } from '@/lib/server/boards'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const boards = await listBoards(guest.id)
    return json({ boards }, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function POST(request: Request) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const body = await request.json().catch(() => null)
    const board = await createBoard(guest.id, body?.name)
    return json(board, 201, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
