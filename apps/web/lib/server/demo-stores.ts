import { demoCart, groupCartByMerchant, merchants, type DemoItem } from './demo-cart'

const catalog = new Map(groupCartByMerchant(demoCart).map((group) => [group.merchantId, group]))

export type DemoOrder = {
  id?: string
  merchantId: string
  cartId?: string
  amount: number
  currency: string
  approvalId?: string
  status: string
  paymentStatus?: string
  items?: DemoItem[]
  error?: string
}

export type TestOrderInput = {
  checkoutId: string
  cartId: string
  merchantId: string
  items: DemoItem[]
  amount: number
  currency: string
  approvalId: string
}

export function createTestStores() {
  return Object.fromEntries(merchants.map(({ id }) => [id, {
    async placeOrder(input: TestOrderInput): Promise<DemoOrder> {
      const { checkoutId, cartId, merchantId, items, amount, currency, approvalId } = input
      if (merchantId !== id || cartId !== demoCart.id || currency !== demoCart.currency) {
        throw new Error(`Invalid ${id} checkout identity`)
      }
      const expected = catalog.get(id)
      if (amount !== expected?.amount || JSON.stringify(items) !== JSON.stringify(expected.items) ||
        !approvalId.startsWith('lsrq_')) {
        throw new Error(`Invalid ${id} checkout amount or approval`)
      }
      return {
        id: `${id}-test-order-${checkoutId}`,
        merchantId: id,
        cartId,
        amount,
        currency,
        approvalId,
        status: 'test_order_created',
        paymentStatus: 'not_charged',
        items,
      }
    },
  }])) as Record<string, { placeOrder: (input: TestOrderInput) => Promise<DemoOrder> }>
}
