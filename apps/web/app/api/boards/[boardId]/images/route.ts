import { addImage } from '@/lib/server/board-images'
import { validationError } from '@/lib/server/errors'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function POST(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const form = await request.formData()
    const file = form.get('image')
    if (!(file instanceof File)) throw validationError('An "image" file field is required')
    const noteValue = form.get('note')
    const note = typeof noteValue === 'string' ? noteValue : null
    const bytes = new Uint8Array(await file.arrayBuffer())
    const image = await addImage(guest.id, boardId, { mimeType: file.type, bytes, note })
    return json(image, 201, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
