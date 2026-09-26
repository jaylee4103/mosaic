import { demoCart, groupCartByMerchant, merchants } from '@/lib/server/demo-cart'
import { json } from '@/lib/server/http'

export const runtime = 'nodejs'

export function GET() {
  const total = groupCartByMerchant(demoCart).reduce((sum, group) => sum + group.amount, 0)
  return json({ ...demoCart, merchants, total })
}
