/**
 * Serper.dev client for internet product search.
 * Calls Google Shopping via Serper API and returns normalized product results.
 */
const SERPER_API_KEY = process.env.SERPER_API_KEY

interface SerperShoppingResult {
  title: string
  price: string
  source: string
  link: string
  image: string
  category?: string
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

  const params = new URLSearchParams({
    q: query,
    tbm: 'shop',
    num: '10',
    hl: 'en',
    gl: 'us',
  })

  if (maxPriceCents) {
    params.set('price', `${Math.floor(maxPriceCents / 100)}_-${''}`)
  }

  const url = `https://www.google.com/search?${params}`

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${SERPER_API_KEY}&cx=009560859551853930049:fsvmnj2qgxm&q=${encodeURIComponent(query)}&searchType=products`,
      {
        method: 'GET',
        headers: { 'X-API-Key': SERPER_API_KEY },
        next: { revalidate: 900 }, // cache 15 minutes at edge
      },
    )

    if (!response.ok) {
      console.error(`[internetSearch] Serper API error: ${response.status}`)
      return []
    }

    const data = await response.json()
    const items = data.items as Array<{
      title: string
      price?: string
      source?: string
      link?: string
      image?: string
      merchant?: string
    }>

    if (!items || items.length === 0) {
      console.log(`[internetSearch] No results for query: ${query}`)
      return []
    }

    const products: InternetProduct[] = items
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
