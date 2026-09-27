/**
 * Product cache layer.
 * Upserts internet search results into Postgres (products + merchants tables).
 * The database serves as a cache for web search results.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase'
import type { InternetProduct } from './internetSearch'

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `web-${Math.abs(hash).toString(36)}-${Buffer.from(str).toString('base64').slice(0, 8)}`
}

export async function cacheSearchResults(
  query: string,
  results: InternetProduct[],
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<number> {
  if (!results || results.length === 0) return 0

  let cached = 0

  for (const product of results) {
    const productId = hashString(`${product.merchantName}-${product.title}`)
    const merchantId = hashString(product.merchantName)

    // Upsert merchant if it doesn't exist
    const { error: merchError } = await db
      .from('merchants')
      .upsert({
        id: merchantId,
        slug: product.merchantName.toLowerCase().replace(/\s+/g, '-'),
        name: product.merchantName,
        checkout_method: 'browser' as const,
        active: true,
      }, { onConflict: 'id' })
      .select()
      .single()

    if (merchError) {
      console.warn(`[productCache] Could not upsert merchant ${product.merchantName}:`, merchError.message)
    }

    // Upsert product
    const { error: prodError } = await db
      .from('products')
      .upsert({
        id: productId,
        merchant_id: merchantId,
        external_id: `web-${query}-${product.title.slice(0, 50)}`,
        name: product.title,
        description: `${product.category} from ${product.merchantName}`,
        category: product.category,
        price_cents: product.priceCents,
        currency: 'usd',
        image_url: product.imageUrl,
        product_url: product.productUrl,
        available: true,
        source: 'internet',
        metadata: { query },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single()

    if (prodError) {
      console.warn(`[productCache] Could not upsert product "${product.title}":`, prodError.message)
    } else {
      cached++
    }
  }

  console.log(`[productCache] Cached ${cached}/${results.length} products for query: ${query}`)
  return cached
}

export async function getCachedProducts(
  query: string,
  category?: string,
  maxPriceCents?: number,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Product[]> {
  let request = db
    .from('products')
    .select('id, merchant_id, name, description, category, price_cents, currency, image_url, product_url, available, metadata')
    .eq('available', true)

  if (category) {
    request = request.ilike('category', category)
  }
  if (maxPriceCents) {
    request = request.lte('price_cents', maxPriceCents)
  }

  const { data, error } = await request.order('metadata', { ascending: false })
  if (error) {
    console.error('[productCache] Error fetching cached products:', error.message)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    merchantId: row.merchant_id,
    merchantName: '',
    name: row.name,
    description: row.description,
    category: row.category,
    priceCents: row.price_cents,
    currency: row.currency,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    available: row.available,
  }))
}
