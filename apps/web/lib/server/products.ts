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

export async function searchProducts(
  filters: ProductSearchFilters,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Product[]> {
  let request = db
    .from('products')
    .select('id, merchant_id, name, description, category, price_cents, currency, image_url, product_url, available')
    .eq('available', true)
    .order('name', { ascending: true })

  if (filters.category) request = request.ilike('category', filters.category)
  if (typeof filters.maxPriceCents === 'number') request = request.lte('price_cents', filters.maxPriceCents)
  if (filters.query) request = request.ilike('name', `%${filters.query}%`)

  const { data, error } = await request
  if (error) throw new Error('Could not search products')
  const rows = (data ?? []) as ProductRow[]
  if (rows.length === 0) return []

  const merchantIds = [...new Set(rows.map((row) => row.merchant_id))]
  const { data: merchants, error: merchantError } = await db.from('merchants').select('id, name').in('id', merchantIds)
  if (merchantError) throw new Error('Could not load merchants for search results')
  const merchantNameById = new Map(((merchants ?? []) as Array<{ id: string; name: string }>).map((m) => [m.id, m.name]))

  return rows.map((row) => ({
    id: row.id,
    merchantId: row.merchant_id,
    merchantName: merchantNameById.get(row.merchant_id) ?? 'Unknown merchant',
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
