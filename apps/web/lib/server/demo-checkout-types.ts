import type { DemoOrder } from './demo-stores'
import type { LinkApproval } from './link'
import type { DemoPayment } from './stripe-payments'

export type DemoCheckoutState = {
  id: string
  cartId: string
  currency: string
  total: number
  requests: LinkApproval[]
  orders: DemoOrder[]
  payments: DemoPayment[]
}

export type DemoCheckout = DemoCheckoutState & { status: string }
