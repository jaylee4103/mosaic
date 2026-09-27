/**
 * Serper.dev client for internet product search.
 * Calls Google Shopping via Serper API (POST to google.serper.dev/search).
 * Returns normalized product results.
 */
const SERPER_API_KEY = process.env.SERPER_API_KEY

interface SerperProduct {
  title: string
  price: string
  source: string
  link: string
  image: string
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
      tbm: 'shop',
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
    const shoppingResults = data.shopping as SerperProduct[]

    if (!shoppingResults || shoppingResults.length === 0) {
      console.log(`[internetSearch] No results for query: ${query}`)
      return []
    }

    const products: InternetProduct[] = shoppingResults
      .filter((item) => item.title && item.source)
      .map((item) => ({
        title: item.title,
        priceCents: parsePrice(item.price ?? '0'),
        merchantName: item.source ?? 'Unknown',
        productUrl: item.link ?? '',
        imageUrl: item.image ?? '',
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

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '0') return 0
  const cleaned = priceStr.replace(/[^0-9.]/g, '')
  const dollars = parseFloat(cleaned)
  if (isNaN(dollars)) return 0
  return Math.round(dollars * 100)
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
