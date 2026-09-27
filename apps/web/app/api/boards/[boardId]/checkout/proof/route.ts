import { listCheckoutProofs, runMerchantCheckout } from '@/lib/server/browserCheckout'
import { validationError } from '@/lib/server/errors'
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

// Runs the browser-driven checkout-proof flow (see
// .spec/browser-checkout-proof.md) for one cart item's product. Distinct
// from POST /checkout (lib/server/checkout.ts's Stripe flow) — this is only
// for merchants.checkout_method = 'browser', where there's no API to hand
// off to, so the "Start checkout" UI action calls both endpoints per item
// depending on its merchant's checkout method.
export async function POST(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const body = await request.json().catch(() => null)
    if (typeof body?.productId !== 'string' || body.productId.length === 0) {
      throw validationError('productId is required')
    }
    const proof = await runMerchantCheckout(guest.id, boardId, body.productId)
    return json(proof, 201, guest)
  } catch (error) {
    return routeError(error, guest)
  }
}
