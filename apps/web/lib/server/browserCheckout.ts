import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { notFoundError, validationError } from './errors'
import { isGoogleInterstitialUrl, resolveDirectProductUrl } from './internetSearch'
import { getProductsByIds } from './products'
import { getSupabaseAdmin } from './supabase'

// See .spec/browser-checkout-proof.md. Mirrors board-images.ts's IMAGE_BUCKET pattern.
export const CHECKOUT_PROOF_BUCKET = 'mosaic-checkout-proofs'
const SIGNED_URL_TTL_SECONDS = 60 * 60
const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8100'

function serviceError(message: string): Error {
  return Object.assign(new Error(message), { code: 'BROWSER_SERVICE_UNAVAILABLE' })
}

type StoppedReason =
  | 'payment_gate_reached'
  | 'payment_gate_not_found'
  | 'selector_not_found'
  | 'captcha_detected'
  | 'login_required'
  | 'timeout'
  | 'disallowed_by_robots'

type CheckoutStep = { step: string; success: boolean; url: string; detail: string | null }

type CheckoutFlowResponse = {
  success: boolean
  stoppedReason: StoppedReason
  screenshotBase64: string | null
  finalUrl: string
  steps: CheckoutStep[]
  error: string | null
}

export type CheckoutProof = {
  id: string
  boardId: string
  productId: string
  merchantId: string
  success: boolean
  stoppedReason: StoppedReason
  finalUrl: string
  screenshotUrl: string | null
  steps: CheckoutStep[]
  error: string | null
  createdAt: string
}

type MerchantRow = { id: string; slug: string; checkout_method: string; checkout_selectors: { addToCart?: string[]; checkout?: string[] } | null }
type ProofRow = {
  id: string
  board_id: string
  product_id: string
  merchant_id: string
  success: boolean
  stopped_reason: string
  final_url: string
  screenshot_path: string | null
  steps_json: CheckoutStep[]
  error: string | null
  created_at: string
}

async function fetchMerchant(merchantId: string, db: SupabaseClient): Promise<MerchantRow> {
  const { data, error } = await db
    .from('merchants')
    .select('id, slug, checkout_method, checkout_selectors')
    .eq('id', merchantId)
    .maybeSingle()
  if (error) throw new Error('Could not look up merchant')
  if (!data) throw notFoundError('Merchant not found')
  return data as MerchantRow
}

async function callBrowserService(
  productUrl: string,
  merchant: MerchantRow,
  fetcher: typeof fetch,
): Promise<CheckoutFlowResponse> {
  let response: Response
  try {
    response = await fetcher(`${BROWSER_SERVICE_URL}/api/browse/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productUrl,
        addToCartSelectors: merchant.checkout_selectors?.addToCart,
        checkoutSelectors: merchant.checkout_selectors?.checkout,
      }),
    })
  } catch {
    throw serviceError('The browser checkout service could not be reached')
  }
  if (!response.ok) throw serviceError('The browser checkout service could not run the checkout flow')
  return (await response.json()) as CheckoutFlowResponse
}

async function uploadScreenshot(
  boardId: string,
  productId: string,
  base64: string | null,
  db: SupabaseClient,
): Promise<string | null> {
  if (!base64) return null
  const path = `${boardId}/${productId}/${randomUUID()}.png`
  const bytes = Buffer.from(base64, 'base64')
  const { error } = await db.storage.from(CHECKOUT_PROOF_BUCKET).upload(path, bytes, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) {
    console.error('[browser-checkout] screenshot upload failed:', error.message)
    return null
  }
  return path
}

function mapRow(row: ProofRow): Omit<CheckoutProof, 'screenshotUrl'> & { screenshotPath: string | null } {
  return {
    id: row.id,
    boardId: row.board_id,
    productId: row.product_id,
    merchantId: row.merchant_id,
    success: row.success,
    stoppedReason: row.stopped_reason as StoppedReason,
    finalUrl: row.final_url,
    screenshotPath: row.screenshot_path,
    steps: row.steps_json,
    error: row.error,
    createdAt: row.created_at,
  }
}

async function signProof(
  row: ReturnType<typeof mapRow>,
  db: SupabaseClient,
): Promise<CheckoutProof> {
  const { screenshotPath, ...rest } = row
  if (!screenshotPath) return { ...rest, screenshotUrl: null }
  const { data, error } = await db.storage.from(CHECKOUT_PROOF_BUCKET).createSignedUrl(screenshotPath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    console.warn(`[browser-checkout] could not sign screenshot for proof ${row.id}`)
    return { ...rest, screenshotUrl: null }
  }
  return { ...rest, screenshotUrl: data.signedUrl }
}

export async function runMerchantCheckout(
  guestId: string,
  boardId: string,
  productId: string,
  db: SupabaseClient = getSupabaseAdmin(),
  fetcher: typeof fetch = fetch,
): Promise<CheckoutProof> {
  await assertBoardOwnership(guestId, boardId, db)

  const productsById = await getProductsByIds([productId], db)
  const product = productsById.get(productId)
  if (!product) throw notFoundError('Product not found')
  if (!product.productUrl) throw validationError('Product has no URL to check out from')

  const merchant = await fetchMerchant(product.merchantId, db)
  if (merchant.checkout_method !== 'browser') {
    throw validationError(
      `Merchant "${merchant.slug}" uses ${merchant.checkout_method} checkout, not browser automation — use the regular checkout flow instead`,
    )
  }

  // productUrl is often a Google Shopping interstitial (see internetSearch.ts); resolve first or fail cleanly.
  let productUrl = product.productUrl
  if (isGoogleInterstitialUrl(productUrl)) {
    const resolved = await resolveDirectProductUrl(`${product.name} ${product.merchantName}`)
    if (!resolved) throw validationError(`Could not find ${product.merchantName}'s direct product page for checkout`)
    productUrl = resolved
  }

  const result = await callBrowserService(productUrl, merchant, fetcher)
  const screenshotPath = await uploadScreenshot(boardId, productId, result.screenshotBase64, db)

  const { data, error } = await db
    .from('checkout_proofs')
    .upsert(
      {
        board_id: boardId,
        guest_session_id: guestId,
        product_id: productId,
        merchant_id: product.merchantId,
        success: result.success,
        stopped_reason: result.stoppedReason,
        final_url: result.finalUrl,
        screenshot_path: screenshotPath,
        steps_json: result.steps,
        error: result.error,
      },
      { onConflict: 'board_id,product_id' },
    )
    .select('id, board_id, product_id, merchant_id, success, stopped_reason, final_url, screenshot_path, steps_json, error, created_at')
    .single()
  if (error || !data) throw new Error('Could not save checkout proof')

  return signProof(mapRow(data as ProofRow), db)
}

export async function listCheckoutProofs(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<CheckoutProof[]> {
  await assertBoardOwnership(guestId, boardId, db)
  const { data, error } = await db
    .from('checkout_proofs')
    .select('id, board_id, product_id, merchant_id, success, stopped_reason, final_url, screenshot_path, steps_json, error, created_at')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Could not list checkout proofs')
  return Promise.all(((data ?? []) as ProofRow[]).map((row) => signProof(mapRow(row), db)))
}
