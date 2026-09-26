import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { DemoItem } from './demo-cart'

const execFileAsync = promisify(execFile)
const fields = 'id,status,approval_url,amount,currency,credential_type'

export type LinkApproval = {
  id: string
  merchantId: string
  amount: number
  currency: string
  status: string
  approvalUrl: string | null
}

type LinkResult = {
  id?: string
  status?: string
  approval_url?: string
  amount?: number
  currency?: string
  code?: string
  message?: string
}

function unavailable(): Error {
  return Object.assign(new Error('Link CLI approvals require an enabled, authenticated local Node server'), {
    code: 'LINK_CLI_UNAVAILABLE',
  })
}

export async function runLinkCli(args: string[]): Promise<LinkResult> {
  if (process.env.NODE_ENV === 'production' || process.env.LINK_CLI_ENABLED !== 'true') throw unavailable()
  const cliPath = join(process.cwd(), 'node_modules', '@stripe', 'link-cli', 'dist', 'cli.js')
  try {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, ...args], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    })
    const parsed: unknown = JSON.parse(stdout)
    const result = Array.isArray(parsed) ? parsed[0] : parsed
    if (!result || typeof result !== 'object') throw new Error('Link returned an empty response')
    const linkResult = result as LinkResult
    if (linkResult.code || linkResult.message) throw new Error('Link request failed')
    return linkResult
  } catch (error) {
    // Raw CLI output can include payment credentials; never return it to clients.
    if (error instanceof SyntaxError) throw new Error('Link returned invalid JSON')
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') {
      throw new Error('Link request timed out')
    }
    throw new Error('Link command failed')
  }
}

export function createLinkAuthorizer(run: (args: string[]) => Promise<LinkResult> = runLinkCli) {
  return {
    async requestApproval(input: {
      checkoutId: string
      merchantId: string
      merchantName: string
      merchantUrl: string
      amount: number
      currency: string
      items: DemoItem[]
    }): Promise<LinkApproval> {
      const { checkoutId, merchantId, merchantName, merchantUrl, amount, currency, items } = input
      const context = `Mosaic test mode checkout ${checkoutId} for ${merchantName}. ` +
        'This is a demo approval for a separate store in one Mosaic cart. ' +
        'The underlying payment method will not be charged and no store order is placed at this step.'
      const args = [
        'spend-request', 'create',
        '--idempotency-key', `${checkoutId}:${merchantId}`,
        '--merchant-name', merchantName,
        '--merchant-url', merchantUrl,
        '--amount', String(amount),
        '--currency', currency,
        '--context', context,
        '--total', `type:total,display_text:Total,amount:${amount}`,
        '--metadata', `mosaic_checkout_id:${checkoutId}`,
        '--metadata', `mosaic_merchant_id:${merchantId}`,
        '--test', '--request-approval', '--format', 'json', '--filter-output', fields,
      ]
      for (const item of items) {
        args.push('--line-item', `name:${item.name},unit_amount:${item.unitAmount},quantity:${item.quantity}`)
      }
      const result = await run(args)
      if (!result.id || result.amount !== amount || result.currency !== currency || !result.status) {
        throw new Error(`Link approval does not match ${merchantId} total`)
      }
      return { id: result.id, merchantId, amount, currency, status: result.status,
        approvalUrl: result.approval_url ?? null }
    },
    async getStatus(request: LinkApproval): Promise<LinkApproval> {
      const result = await run([
        'spend-request', 'retrieve', request.id, '--format', 'json', '--filter-output', fields,
      ])
      if (result.id !== request.id || result.amount !== request.amount ||
        result.currency !== request.currency || !result.status) {
        throw new Error(`Link approval does not match ${request.merchantId} total`)
      }
      return { ...request, status: result.status, approvalUrl: result.approval_url ?? request.approvalUrl }
    },
  }
}
