/**
 * Serper.dev client for internet product search.
 * Calls Google Shopping via Serper's dedicated /shopping endpoint — NOT
 * /search's organic web results. Organic results are frequently category or
 * listing pages (e.g. a retailer's "Arctic Posters" browse page listing
 * dozens of items, no single price) rather than a specific product, which
 * silently corrupted every downstream productUrl/priceCents/imageUrl. The
 * Shopping endpoint returns individual listings with a real price and image
 * per item, because that's what Google's Shopping tab itself indexes.
 */
import { categorizeProducts } from '@/lib/ai/productCategorizer'

const SERPER_API_KEY = process.env.SERPER_API_KEY

interface SerperShoppingResult {
  title: string
  source: string
  link: string
  price?: string
  imageUrl?: string
  position: number
}

interface InternetProduct {
  title: string
  priceCents: number
  merchantName: string
  productUrl: string
  imageUrl: string
  category: string
  query: string
}

export async function searchInternet(
  query: string,
  category?: string,
  maxPriceCents?: number,
): Promise<InternetProduct[]> {
  if (!SERPER_API_KEY) {
    console.warn('[internetSearch] SERPER_API_KEY not configured, returning empty results')
    return []
  }

  try {
    const body: Record<string, unknown> = {
      q: query,
      num: 10,
      gl: 'us',
      hl: 'en',
    }
    if (maxPriceCents) {
      const min = Math.floor(maxPriceCents / 100)
      const max = Math.ceil(maxPriceCents / 100)
      body.price = `${min}-${max}`
    }

    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error(`[internetSearch] Serper API error: ${response.status}`)
      return []
    }

    const data = await response.json()
    const shoppingResults = data.shopping as SerperShoppingResult[]

    if (!shoppingResults || shoppingResults.length === 0) {
      console.log(`[internetSearch] No results for query: ${query}`)
      return []
    }

    const validResults = shoppingResults.filter((item) => item.title && item.link)

    // One batched classification call per query's result set — not per
    // product, not a keyword list — so the category actually reflects what
    // the item is, and a single call covers up to ~10 results.
    const categories = category
      ? validResults.map(() => category)
      : await categorizeProducts(validResults.map((item) => item.title))

    const products: InternetProduct[] = validResults.map((item, i) => ({
      title: item.title,
      priceCents: parsePrice(item.price ?? ''),
      merchantName: item.source || extractMerchant(item.link),
      productUrl: item.link,
      imageUrl: item.imageUrl ?? '',
      category: categories[i] ?? 'general',
      query,
    }))

    console.log(`[internetSearch] ${products.length} results for query: ${query}`)
    return products
  } catch (err) {
    console.error(`[internetSearch] Failed to search for "${query}":`, err)
    return []
  }
}

function parsePrice(price: string): number {
  // Shopping results give a single price per listing, e.g. "$24.99" — no
  // range-guessing needed the way the old snippet-scraping approach required.
  const match = price.match(/(\d+(?:\.\d+)?)/)
  if (match) {
    const dollars = parseFloat(match[1])
    if (!isNaN(dollars)) return Math.round(dollars * 100)
  }
  return 0
}

function extractMerchant(link: string): string {
  try {
    const url = new URL(link)
    const hostname = url.hostname
    // Remove "www." and extract domain name
    const parts = hostname.replace('www.', '').split('.')
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    }
  } catch {
    // ignore
  }
  return 'Unknown'
}

export type { InternetProduct }
