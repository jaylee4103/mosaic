import { validationError } from '@/lib/server/errors'
import { json, routeError } from '@/lib/server/http'
import { searchProducts } from '@/lib/server/products'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')?.trim() || undefined
    const category = url.searchParams.get('category')?.trim() || undefined
    const maxPriceParam = url.searchParams.get('maxPrice')

    let maxPriceCents: number | undefined
    if (maxPriceParam !== null && maxPriceParam !== '') {
      maxPriceCents = Number(maxPriceParam)
      if (!Number.isFinite(maxPriceCents) || maxPriceCents < 0) {
        throw validationError('maxPrice must be a non-negative number of cents')
      }
    }

    const products = await searchProducts({ query, category, maxPriceCents })
    return json({ products })
  } catch (error) {
    return routeError(error)
  }
}
