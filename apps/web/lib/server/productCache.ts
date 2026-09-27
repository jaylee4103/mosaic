/**
 * Product cache layer.
 * Upserts internet search results into Postgres (products + merchants tables).
 * The database serves as a cache for web search results.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase'
import type { InternetProduct } from './internetSearch'

function uid(): string {
  return crypto.randomUUID()
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export async function cacheSearchResults(
  query: string,
  results: InternetProduct[],
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<number> {
  if (!results || results.length === 0) return 0

  let cached = 0

  for (const product of results) {
    const productId = uid()
    const merchantSlug = slugify(product.merchantName)

    // Upsert merchant by slug (unique constraint) to avoid duplicate key errors
    const { error: merchError } = await db
      .from('merchants')
      .upsert({
        slug: merchantSlug,
        name: product.merchantName,
        checkout_method: 'browser' as const,
        active: true,
      }, { onConflict: 'slug' })
      .select()
      .single()

    if (merchError) {
      console.warn(`[productCache] Could not upsert merchant ${product.merchantName}:`, merchError.message)
      continue
    }

    // Get the merchant ID after upsert
    const { data: merchantRow } = await db
      .from('merchants')
      .select('id')
      .eq('slug', merchantSlug)
      .maybeSingle()
    const merchantId = (merchantRow as { id: string } | null)?.id
    if (!merchantId) {
      console.warn(`[productCache] Could not find merchant ID for ${product.merchantName}`)
      continue
    }

    // Upsert product
    const { error: prodError } = await db
      .from('products')
      .upsert({
        id: productId,
        merchant_id: merchantId,
        external_id: `web-${uid()}`,
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

