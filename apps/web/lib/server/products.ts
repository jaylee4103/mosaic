import type { SupabaseClient } from '@supabase/supabase-js'
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
  let request = db.from('products').select(PRODUCT_COLUMNS).eq('available', true).order('name', { ascending: true })

  if (typeof filters.maxPriceCents === 'number') request = request.lte('price_cents', filters.maxPriceCents)
  const { data, error } = await request
  if (error) throw new Error('Could not search products')
  // The seeded catalog is small. Match generated multi-word searches against
  // names, descriptions, and categories so a phrase such as "warm ceramic
  // lamp" can retrieve candidates for AI ranking. A larger provider should
  // replace this with indexed search while preserving the response contract.
  //
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
  const candidates = ((data ?? []) as ProductRow[]).map((row) => {
    const searchable = `${row.name} ${row.description ?? ''} ${row.category ?? ''}`.toLowerCase()
    return { row, score: tokens.filter((token) => searchable.includes(token)).length }
  })
  const bestScore = Math.max(0, ...candidates.map((candidate) => candidate.score))
  const rows = candidates.filter((candidate) => tokens.length === 0 || (candidate.score > 0 && candidate.score === bestScore))
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
