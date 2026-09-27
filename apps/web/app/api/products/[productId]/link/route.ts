import { notFoundError } from '@/lib/server/errors'
import { routeError } from '@/lib/server/http'
import { resolveProductViewUrl } from '@/lib/server/products'

export const runtime = 'nodejs'

type Context = { params: Promise<{ productId: string }> }

// "View product" target — see resolveProductViewUrl for why this can't just
// be the raw stored productUrl.
export async function GET(_request: Request, { params }: Context) {
  try {
    const { productId } = await params
    const url = await resolveProductViewUrl(productId)
    if (!url) throw notFoundError('No product page available')
    return Response.redirect(url, 302)
  } catch (error) {
    return routeError(error)
  }
}
