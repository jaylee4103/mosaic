import { deleteImage, updateImage } from '@/lib/server/board-images'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string; imageId: string }> }

export async function PATCH(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId, imageId } = await params
    const body = await request.json().catch(() => null)
    const image = await updateImage(guest.id, boardId, imageId, {
      note: body?.note,
      position: body?.position,
    })
    return json(image, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}

export async function DELETE(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId, imageId } = await params
    await deleteImage(guest.id, boardId, imageId)
    return json({ ok: true }, 200, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
