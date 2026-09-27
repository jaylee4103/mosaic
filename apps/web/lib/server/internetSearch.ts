/**
 * Serper.dev client for internet product search. Uses /shopping, not
 * /search's organic results (those are often category/listing pages).
 */
import { categorizeProducts } from '@/lib/ai/productCategorizer'

const SERPER_API_KEY = process.env.SERPER_API_KEY

// Shopping results requested per query. Serper sometimes returns more than
// this regardless (observed up to 40 even when set to 10) — treated as a
// request hint, not a hard cap. Tune via env instead of a code change.
const ITEMS_PER_QUERY = Number(process.env.SEARCH_ITEMS_PER_QUERY ?? 10)

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
      num: ITEMS_PER_QUERY,
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

    // Serper's num param is a hint, not a hard cap (observed returning up to
    // 40 results even when set to 10) — slice explicitly so the env var
    // actually controls the count regardless of what Serper decides to send.
    const validResults = shoppingResults.filter((item) => item.title && item.link).slice(0, ITEMS_PER_QUERY)

    // One batched classification call per query's result set, not per product.
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
  // Shopping results give a single price per listing, e.g. "$24.99".
  const match = price.match(/(\d+(?:\.\d+)?)/)
  if (match) {
    const dollars = parseFloat(match[1])
    if (!isNaN(dollars)) return Math.round(dollars * 100)
  }
  return 0
}

// Serper's /shopping `link` is always a Google Shopping interstitial, never
// a direct merchant URL (confirmed live, undocumented). Resolved lazily,
// only when something actually acts on the link.
export function isGoogleInterstitialUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('google.')
  } catch {
    return false
  }
}

// Falls back to a targeted organic search ("<title> <merchant>") and takes the first non-Google result.
export async function resolveDirectProductUrl(query: string): Promise<string | null> {
  if (!SERPER_API_KEY) return null
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 5, gl: 'us', hl: 'en' }),
    })
    if (!response.ok) {
      console.error(`[internetSearch] resolveDirectProductUrl: Serper API error ${response.status}`)
      return null
    }
    const data = await response.json()
    const organic = (data.organic ?? []) as Array<{ link?: string }>
    const direct = organic.find((item) => item.link && !isGoogleInterstitialUrl(item.link))
    return direct?.link ?? null
  } catch (err) {
    console.error(`[internetSearch] resolveDirectProductUrl failed for "${query}":`, err)
    return null
  }
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
