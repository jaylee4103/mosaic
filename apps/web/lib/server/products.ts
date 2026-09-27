import type { SupabaseClient } from '@supabase/supabase-js'
import { isGoogleInterstitialUrl, resolveDirectProductUrl } from './internetSearch'
import { getSupabaseAdmin } from './supabase'

// This is the `searchProducts(query, category, maxPrice)` interface described
// in the root README's "Product discovery" section. Today it queries the
// `products`/`merchants` tables (seeded by scripts/seed-products.ts). Swapping
// in a real merchant feed or shopping API later only means changing this
// file's implementation — the shape returned to callers should stay the same.
export type Product = {
  id: string
  merchantId: string
  merchantName: string
  checkoutMethod: string
  name: string
  description: string | null
  category: string | null
  priceCents: number
  currency: string
  imageUrl: string | null
  productUrl: string | null
  available: boolean
}

export type ProductSearchFilters = {
  query?: string
  category?: string
  maxPriceCents?: number
}

type ProductRow = {
  id: string
  merchant_id: string
  name: string
  description: string | null
  category: string | null
  price_cents: number
  currency: string
  image_url: string | null
  product_url: string | null
  available: boolean
}

const PRODUCT_COLUMNS = 'id, merchant_id, name, description, category, price_cents, currency, image_url, product_url, available'

function mapProductRow(row: ProductRow, merchantName: string, checkoutMethod: string): Product {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    merchantName,
    checkoutMethod,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCents: row.price_cents,
    currency: row.currency,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    available: row.available,
  }
}

async function attachMerchantNames(rows: ProductRow[], db: SupabaseClient): Promise<Product[]> {
  if (rows.length === 0) return []
  const merchantIds = [...new Set(rows.map((row) => row.merchant_id))]
  const { data, error } = await db.from('merchants').select('id, name, checkout_method').in('id', merchantIds)
  if (error) throw new Error('Could not load merchants for products')
  const merchantById = new Map(
    ((data ?? []) as Array<{ id: string; name: string; checkout_method: string }>).map((m) => [m.id, m]),
  )
  return rows.map((row) => {
    const merchant = merchantById.get(row.merchant_id)
    return mapProductRow(row, merchant?.name ?? 'Unknown merchant', merchant?.checkout_method ?? 'manual')
  })
}

export async function searchProducts(
  filters: ProductSearchFilters,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Product[]> {
  // `category` is folded into the token match instead of an exact `WHERE`
  // filter: it's an inferred guess on both sides (the agent's freeform
  // guess, and internetSearch.ts's keyword-based inference for cached
  // internet products) — an exact match between two guessers is fragile by
  // construction (e.g. agent says "clothing", cache inferred "general" for a
  // jacket neither's keyword list covered), and a hard filter turns any such
  // mismatch into a silent, permanent zero-result search.
  const tokens = [
    ...new Set(
      `${filters.query ?? ''} ${filters.category ?? ''}`.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [],
    ),
  ]

  let request = db.from('products').select(PRODUCT_COLUMNS).eq('available', true).order('name', { ascending: true })
  if (typeof filters.maxPriceCents === 'number') request = request.lte('price_cents', filters.maxPriceCents)
  // Push the token match into SQL (against the trigram-indexed
  // name/description/category columns — see products_search_trgm_idx)
  // instead of pulling the whole available-products table and re-scanning
  // it in JS on every call.
  if (tokens.length > 0) {
    const orClause = tokens
      .flatMap((token) => ['name', 'description', 'category'].map((column) => `${column}.ilike.%${token}%`))
      .join(',')
    request = request.or(orClause)
  }

  const { data, error } = await request
  if (error) throw new Error('Could not search products')

  // SQL already narrowed the candidate set to rows matching at least one
  // token; rank the (much smaller) result set by token coverage so the
  // best-matching rows come first.
  const candidates = ((data ?? []) as ProductRow[]).map((row) => {
    const searchable = `${row.name} ${row.description ?? ''} ${row.category ?? ''}`.toLowerCase()
    return { row, score: tokens.filter((token) => searchable.includes(token)).length }
  })
  const bestScore = Math.max(0, ...candidates.map((candidate) => candidate.score))
  const rows = candidates.filter((candidate) => tokens.length === 0 || candidate.score === bestScore)
    .map((candidate) => candidate.row)
  return attachMerchantNames(rows, db)
}

// Used by the cart service to resolve current catalog prices/details for
// items already in a cart — includes unavailable products (a cart shouldn't
// silently drop an item just because the merchant marked it unavailable).
export async function getProductsByIds(
  ids: string[],
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Map<string, Product>> {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) return new Map()
  const { data, error } = await db.from('products').select(PRODUCT_COLUMNS).in('id', uniqueIds)
  if (error) throw new Error('Could not load products')
  const products = await attachMerchantNames((data ?? []) as ProductRow[], db)
  return new Map(products.map((product) => [product.id, product]))
}

// The cached productUrl for internet-sourced products is frequently a
// Google Shopping interstitial, not the merchant's real page (see
// internetSearch.ts — same reason run_merchant_checkout and browse_webpage
// resolve it before acting). "View product" needs the same treatment: a
// user clicking through should land on the actual retailer page, not
// Google's aggregator. Resolved lazily on first view, then the resolution
// is written back to products.product_url so later views for the same
// product skip the extra Serper call.
export async function resolveProductViewUrl(
  productId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<string | null> {
  const { data, error } = await db.from('products').select('name, product_url, merchant_id').eq('id', productId).maybeSingle()
  if (error) throw new Error('Could not look up product')
  const row = data as { name: string; product_url: string | null; merchant_id: string } | null
  if (!row?.product_url) return null
  if (!isGoogleInterstitialUrl(row.product_url)) return row.product_url

  const { data: merchantRow } = await db.from('merchants').select('name').eq('id', row.merchant_id).maybeSingle()
  const merchantName = (merchantRow as { name: string } | null)?.name ?? ''
  const resolved = await resolveDirectProductUrl(`${row.name} ${merchantName}`.trim())
  if (!resolved) return null

  const { error: updateError } = await db.from('products').update({ product_url: resolved }).eq('id', productId)
  if (updateError) console.warn(`[products] Could not cache resolved URL for ${productId}:`, updateError.message)

  return resolved
}
