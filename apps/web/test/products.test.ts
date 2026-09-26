import { expect, test } from 'bun:test'
import { searchProducts } from '../lib/server/products'
import { createFakeSupabase } from './support/fake-supabase'

const MERCHANT_A = { id: 'merchant-a', slug: 'sol-and-clay', name: 'Sol & Clay' }
const MERCHANT_B = { id: 'merchant-b', slug: 'north-loom', name: 'North Loom' }

function seedCatalog() {
  return createFakeSupabase({
    merchants: [MERCHANT_A, MERCHANT_B],
    products: [
      {
        id: 'p1',
        merchant_id: 'merchant-a',
        name: 'Ceramic Bedside Lamp',
        description: 'Warm ceramic lamp.',
        category: 'lighting',
        price_cents: 5500,
        currency: 'usd',
        image_url: null,
        product_url: 'https://example.com/lamp',
        available: true,
      },
      {
        id: 'p2',
        merchant_id: 'merchant-b',
        name: 'Natural Wood Side Table',
        description: 'Round side table.',
        category: 'furniture',
        price_cents: 8900,
        currency: 'usd',
        image_url: null,
        product_url: 'https://example.org/table',
        available: true,
      },
      {
        id: 'p3',
        merchant_id: 'merchant-b',
        name: 'Discontinued Rug',
        description: 'No longer sold.',
        category: 'textiles',
        price_cents: 12000,
        currency: 'usd',
        image_url: null,
        product_url: 'https://example.org/rug',
        available: false,
      },
    ],
  })
}

test('searchProducts returns available products with merchant names, sorted by name', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({}, client)
  expect(products.map((p) => p.name)).toEqual(['Ceramic Bedside Lamp', 'Natural Wood Side Table'])
  expect(products.find((p) => p.id === 'p1')?.merchantName).toBe('Sol & Clay')
  expect(products.find((p) => p.id === 'p2')?.merchantName).toBe('North Loom')
})

test('searchProducts excludes unavailable products', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({}, client)
  expect(products.some((p) => p.id === 'p3')).toBe(false)
})

test('searchProducts filters by category case-insensitively', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({ category: 'Lighting' }, client)
  expect(products).toHaveLength(1)
  expect(products[0].id).toBe('p1')
})

test('searchProducts filters by maxPriceCents', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({ maxPriceCents: 6000 }, client)
  expect(products.map((p) => p.id)).toEqual(['p1'])
})

test('searchProducts filters by a case-insensitive query substring on name', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({ query: 'wood' }, client)
  expect(products.map((p) => p.id)).toEqual(['p2'])
})

test('searchProducts retrieves candidates from a multi-word vibe query', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({ query: 'warm Mediterranean ceramic lamp' }, client)
  expect(products.map((p) => p.id)).toEqual(['p1'])
})

test('searchProducts returns an empty array when nothing matches', async () => {
  const { client } = seedCatalog()
  const products = await searchProducts({ category: 'gifts' }, client)
  expect(products).toEqual([])
})
