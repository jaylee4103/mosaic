import { refreshPayments } from '@/lib/server/checkout'
import { getOrCreateGuest, type GuestSession } from '@/lib/server/guest-session'
import { json, routeError } from '@/lib/server/http'

export const runtime = 'nodejs'

type Context = { params: Promise<{ boardId: string }> }

export async function GET(request: Request, { params }: Context) {
  let guest: GuestSession | undefined
  try {
    guest = await getOrCreateGuest(request)
    const { boardId } = await params
    const checkout = await refreshPayments(guest.id, boardId)
    if (!checkout) return json({ error: 'Checkout not started', code: 'NOT_FOUND' }, 404, guest)
    return json(
      {
        checkoutId: checkout.id,
        status: checkout.status,
        merchantOrders: checkout.merchantOrders.map(({ merchantId, merchantName, amountCents, currency, paymentStatus, paymentMethodType, linkVerified }) => ({
          merchantId,
          merchantName,
          amountCents,
          currency,
          paymentStatus,
          paymentMethodType,
          linkVerified,
        })),
      },
      200,
      guest,
    )
  } catch (error) {
    return routeError(error, guest)
  }
}
