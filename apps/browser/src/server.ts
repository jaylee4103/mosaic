import { z } from 'zod'
import { closeBrowser } from './browserInstance'
import { runCheckoutFlow } from './checkoutFlow'

const CheckoutRequestSchema = z.object({
  productUrl: z.string().url(),
  quantity: z.number().int().positive().optional(),
  addToCartSelectors: z.array(z.string()).optional(),
  checkoutSelectors: z.array(z.string()).optional(),
})

const PORT = Number(process.env.PORT ?? 8100)

const server = Bun.serve({
  port: PORT,
  idleTimeout: 180,
  async fetch(req) {
    const url = new URL(req.url)
    console.log(`[browser-service] ${req.method} ${url.pathname}`)

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' })
    }

    if (url.pathname === '/api/browse/checkout' && req.method === 'POST') {
      let body: unknown
      try {
        body = await req.json()
      } catch {
        console.error('[browser-service] invalid JSON body')
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const parsed = CheckoutRequestSchema.safeParse(body)
      if (!parsed.success) {
        console.error(`[browser-service] invalid request: ${JSON.stringify(parsed.error.flatten())}`)
        return Response.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
      }

      try {
        const result = await runCheckoutFlow(parsed.data)
        console.log(`[browser-service] checkout flow result: success=${result.success} stoppedReason=${result.stoppedReason}`)
        return Response.json(result)
      } catch (err) {
        console.error(`[browser-service] checkout flow crashed: ${err instanceof Error ? err.stack : String(err)}`)
        return Response.json({ error: 'Checkout flow failed unexpectedly' }, { status: 500 })
      }
    }

    console.warn(`[browser-service] 404: ${url.pathname}`)
    return new Response('Not found', { status: 404 })
  },
})

console.log(`[browser-service] listening on :${server.port}`)

process.on('SIGTERM', async () => {
  await closeBrowser()
  process.exit(0)
})
process.on('SIGINT', async () => {
  await closeBrowser()
  process.exit(0)
})
