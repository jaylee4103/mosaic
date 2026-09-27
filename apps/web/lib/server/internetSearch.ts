/**
 * Serper.dev client for internet product search.
 * Calls Google Shopping via Serper API (POST to google.serper.dev/search).
 * Parses organic results and normalizes to product shape.
 */
const SERPER_API_KEY = process.env.SERPER_API_KEY

interface SerperOrganicResult {
  title: string
  link: string
  snippet: string
  rating?: number
  ratingCount?: number
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

    const response = await fetch('https://google.serper.dev/search', {
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
    const organicResults = data.organic as SerperOrganicResult[]

    if (!organicResults || organicResults.length === 0) {
      console.log(`[internetSearch] No results for query: ${query}`)
      return []
    }

    const products: InternetProduct[] = organicResults
      .filter((item) => item.title && item.link)
      .map((item) => ({
        title: item.title,
        priceCents: parsePriceFromSnippet(item.snippet ?? ''),
        merchantName: extractMerchant(item.link ?? ''),
        productUrl: item.link,
        imageUrl: '',
        category: category ?? inferCategory(query),
        query,
      }))

    console.log(`[internetSearch] ${products.length} results for query: ${query}`)
    return products
  } catch (err) {
    console.error(`[internetSearch] Failed to search for "${query}":`, err)
    return []
  }
}

function parsePriceFromSnippet(snippet: string): number {
  // Match price patterns like "$200.00", "$25 - $49", "$200.00 through $280.00"
  const priceMatches = snippet.match(/\$\s?(\d+(?:\.\d+)?)/g)
  if (priceMatches && priceMatches.length > 0) {
    const firstPrice = priceMatches[0].replace(/[$\s]/g, '')
    const dollars = parseFloat(firstPrice)
    if (!isNaN(dollars)) {
      return Math.round(dollars * 100)
    }
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

function inferCategory(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('lamp') || q.includes('light') || q.includes('lighting')) return 'lighting'
  if (q.includes('chair') || q.includes('table') || q.includes('sofa')) return 'furniture'
  if (q.includes('rug') || q.includes('throw') || q.includes('textile')) return 'textiles'
  if (q.includes('shirt') || q.includes('pants') || q.includes('outfit')) return 'clothing'
  if (q.includes('vase') || q.includes('planter') || q.includes('decor')) return 'decor'
  return 'general'
}

export type { InternetProduct }
