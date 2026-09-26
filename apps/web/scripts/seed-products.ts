// Idempotent demo catalog seed for Step 4 (product search). Run from
// apps/web with `bun run seed:products` (needs SUPABASE_URL and
// SUPABASE_SECRET_KEY in .env.local — Bun loads it automatically).
//
// Safe to re-run: merchants upsert by `slug`, products upsert by
// `(merchant_id, external_id)`.
import { getSupabaseAdmin } from '../lib/server/supabase'

const db = getSupabaseAdmin()

const merchants = [
  { slug: 'sol-and-clay', name: 'Sol & Clay', website_url: 'https://example.com', checkout_method: 'test' },
  { slug: 'north-loom', name: 'North Loom', website_url: 'https://example.org', checkout_method: 'test' },
] as const

const products = [
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'lamp-ceramic-bedside',
    name: 'Ceramic Bedside Lamp',
    description: 'Warm ceramic lamp with an organic, hand-thrown base.',
    category: 'lighting',
    priceCents: 5500,
    productUrl: 'https://example.com/products/ceramic-bedside-lamp',
  },
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'lamp-mushroom',
    name: 'Ceramic Mushroom Lamp',
    description: 'Minimal mushroom-shaped lamp in a warm neutral glaze.',
    category: 'lighting',
    priceCents: 5400,
    productUrl: 'https://example.com/products/ceramic-mushroom-lamp',
  },
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'planter-terracotta',
    name: 'Terracotta Planter',
    description: 'Classic unglazed terracotta planter, medium size.',
    category: 'decor',
    priceCents: 3400,
    productUrl: 'https://example.com/products/terracotta-planter',
  },
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'vase-handthrown',
    name: 'Handthrown Terracotta Vase',
    description: 'Rustic hand-thrown vase with a matte terracotta finish.',
    category: 'decor',
    priceCents: 3800,
    productUrl: 'https://example.com/products/handthrown-terracotta-vase',
  },
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'print-coastal',
    name: 'Coastal Wall Print',
    description: 'Minimal coastal landscape print in a warm neutral palette.',
    category: 'decor',
    priceCents: 4800,
    productUrl: 'https://example.com/products/coastal-wall-print',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'table-wood-side',
    name: 'Natural Wood Side Table',
    description: 'Simple round side table in natural, lightly finished wood.',
    category: 'furniture',
    priceCents: 8900,
    productUrl: 'https://example.org/products/natural-wood-side-table',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'chair-rattan-accent',
    name: 'Rattan Accent Chair',
    description: 'Woven rattan accent chair with a relaxed, organic silhouette.',
    category: 'furniture',
    priceCents: 15900,
    productUrl: 'https://example.org/products/rattan-accent-chair',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'throw-cream-textured',
    name: 'Cream Textured Throw',
    description: 'Chunky knit throw in warm cream, undyed wool blend.',
    category: 'textiles',
    priceCents: 4200,
    productUrl: 'https://example.org/products/cream-textured-throw',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'runner-linen-table',
    name: 'Linen Table Runner',
    description: 'Lightweight stonewashed linen table runner.',
    category: 'textiles',
    priceCents: 2600,
    productUrl: 'https://example.org/products/linen-table-runner',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'rug-woven-jute',
    name: 'Woven Jute Rug',
    description: 'Natural jute rug with a subtle herringbone weave.',
    category: 'textiles',
    priceCents: 12000,
    productUrl: 'https://example.org/products/woven-jute-rug',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'shirt-cream-linen',
    name: 'Cream Linen Shirt',
    description: 'Breathable cream linen shirt for a relaxed summer dinner.',
    category: 'tops',
    priceCents: 6800,
    productUrl: 'https://example.org/products/cream-linen-shirt',
  },
  {
    merchantSlug: 'north-loom',
    externalId: 'trousers-olive-relaxed',
    name: 'Relaxed Olive Trousers',
    description: 'Lightweight olive trousers with a relaxed silhouette.',
    category: 'bottoms',
    priceCents: 7400,
    productUrl: 'https://example.org/products/relaxed-olive-trousers',
  },
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'shoes-brown-leather-loafers',
    name: 'Brown Leather Loafers',
    description: 'Minimal brown leather loafers for a warm, understated outfit.',
    category: 'shoes',
    priceCents: 9800,
    productUrl: 'https://example.com/products/brown-leather-loafers',
  },
  {
    merchantSlug: 'sol-and-clay',
    externalId: 'watch-minimal-gold',
    name: 'Minimal Gold Watch',
    description: 'Simple warm gold watch with a clean face and leather strap.',
    category: 'accessories',
    priceCents: 6300,
    productUrl: 'https://example.com/products/minimal-gold-watch',
  },
] as const

async function upsertMerchants(): Promise<Map<string, string>> {
  const { data, error } = await db.from('merchants').upsert(merchants, { onConflict: 'slug' }).select('id, slug')
  if (error) throw new Error(`Could not upsert merchants: ${error.message}`)
  return new Map((data ?? []).map((row) => [row.slug as string, row.id as string]))
}

async function upsertProducts(merchantIdBySlug: Map<string, string>): Promise<void> {
  const rows = products.map((product) => {
    const merchantId = merchantIdBySlug.get(product.merchantSlug)
    if (!merchantId) throw new Error(`Unknown merchant slug ${product.merchantSlug}`)
    return {
      merchant_id: merchantId,
      external_id: product.externalId,
      name: product.name,
      description: product.description,
      category: product.category,
      price_cents: product.priceCents,
      currency: 'usd',
      product_url: product.productUrl,
      available: true,
    }
  })
  const { error } = await db.from('products').upsert(rows, { onConflict: 'merchant_id,external_id' })
  if (error) throw new Error(`Could not upsert products: ${error.message}`)
}

const merchantIdBySlug = await upsertMerchants()
await upsertProducts(merchantIdBySlug)
process.stdout.write(`Seeded ${merchants.length} merchants and ${products.length} products\n`)
