export type DemoItem = {
  productId: string
  merchantId: string
  name: string
  unitAmount: number
  quantity: number
}

export type MerchantGroup = {
  merchantId: string
  items: DemoItem[]
  amount: number
}

export const merchants = [
  { id: 'store-a', name: 'Mosaic Demo Store A' },
  { id: 'store-b', name: 'Mosaic Demo Store B' },
] as const

export const demoCart = {
  id: 'cart-demo-1',
  currency: 'usd',
  items: [
    { productId: 'lamp-a', merchantId: 'store-a', name: 'Ceramic Demo Lamp', unitAmount: 100, quantity: 1 },
    { productId: 'vase-b', merchantId: 'store-b', name: 'Terracotta Demo Vase', unitAmount: 200, quantity: 1 },
  ] satisfies DemoItem[],
}

export function groupCartByMerchant(cart: { items: DemoItem[] }): MerchantGroup[] {
  const groups = new Map<string, DemoItem[]>()
  for (const item of cart.items) {
    if (!Number.isSafeInteger(item.unitAmount) || item.unitAmount < 0) {
      throw new Error(`Invalid price for ${item.productId}`)
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Invalid quantity for ${item.productId}`)
    }
    groups.set(item.merchantId, [...(groups.get(item.merchantId) ?? []), item])
  }
  return [...groups].map(([merchantId, items]) => {
    const amount = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
    if (!Number.isSafeInteger(amount)) throw new Error(`Invalid ${merchantId} total`)
    return { merchantId, items, amount }
  })
}
