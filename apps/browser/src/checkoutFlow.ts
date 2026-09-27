import type { Page } from 'playwright'
import { getBrowser } from './browserInstance'
import { isCaptchaPage, isPaymentGate } from './checkoutGate'
import { PLACEHOLDER_IDENTITY } from './placeholder'
import { ADD_TO_CART_PATTERNS, CHECKOUT_PATTERNS } from './selectors'
import type { CheckoutFlowOptions, CheckoutFlowResult, CheckoutStep, CheckoutStepName } from './types'

const STEP_TIMEOUT_MS = 10_000
const FLOW_TIMEOUT_MS = 60_000

class FlowStop extends Error {
  constructor(
    public readonly reason: CheckoutFlowResult['stoppedReason'],
    message?: string,
  ) {
    super(message ?? reason)
  }
}

async function clickFirstMatch(page: Page, patterns: string[]): Promise<string | null> {
  for (const selector of patterns) {
    const locator = page.locator(selector).first()
    try {
      if ((await locator.count()) === 0) continue
      if (!(await locator.isVisible()) || !(await locator.isEnabled())) continue
      await locator.click({ timeout: STEP_TIMEOUT_MS })
      return selector
    } catch {
      continue
    }
  }
  return null
}

async function guardAgainstGates(page: Page): Promise<void> {
  if (await isCaptchaPage(page)) throw new FlowStop('captcha_detected', 'CAPTCHA or bot-check page detected')
}

async function screenshotPage(page: Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false, type: 'png' })
  return buffer.toString('base64')
}

export async function runCheckoutFlow(options: CheckoutFlowOptions): Promise<CheckoutFlowResult> {
  const steps: CheckoutStep[] = []
  const addToCartPatterns = [...(options.addToCartSelectors ?? []), ...ADD_TO_CART_PATTERNS]
  const checkoutPatterns = [...(options.checkoutSelectors ?? []), ...CHECKOUT_PATTERNS]

  const record = (step: CheckoutStepName, success: boolean, url: string, detail: string | null) => {
    steps.push({ step, success, url, detail })
  }

  const browser = await getBrowser()
  const context = await browser.newContext()
  const page = await context.newPage()

  const deadline = Date.now() + FLOW_TIMEOUT_MS
  const remaining = () => deadline - Date.now()

  try {
    await page.goto(options.productUrl, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT_MS })

    // Step 1: add to cart
    await guardAgainstGates(page)
    const addSelector = await clickFirstMatch(page, addToCartPatterns)
    if (!addSelector) throw new FlowStop('selector_not_found', 'No add-to-cart control matched known patterns')
    record('add_to_cart', true, page.url(), addSelector)
    await page.waitForTimeout(1000)

    if (remaining() <= 0) throw new FlowStop('timeout')

    // Step 2/3: open cart -> begin checkout
    await guardAgainstGates(page)
    if (await isPaymentGate(page)) {
      record('reach_payment_gate', true, page.url(), 'gate reached immediately after add-to-cart')
      return {
        success: true,
        stoppedReason: 'payment_gate_reached',
        screenshotBase64: await screenshotPage(page),
        finalUrl: page.url(),
        steps,
        error: null,
      }
    }

    const checkoutSelector = await clickFirstMatch(page, checkoutPatterns)
    if (!checkoutSelector) throw new FlowStop('selector_not_found', 'No checkout control matched known patterns')
    record('begin_checkout', true, page.url(), checkoutSelector)
    await page.waitForLoadState('domcontentloaded', { timeout: STEP_TIMEOUT_MS }).catch(() => {})

    if (remaining() <= 0) throw new FlowStop('timeout')

    // Step 4: gate check before touching any form
    await guardAgainstGates(page)
    if (await isPaymentGate(page)) {
      record('reach_payment_gate', true, page.url(), 'gate reached after begin_checkout')
      return {
        success: true,
        stoppedReason: 'payment_gate_reached',
        screenshotBase64: await screenshotPage(page),
        finalUrl: page.url(),
        steps,
        error: null,
      }
    }

    // Step 5: best-effort guest/shipping fill using placeholder identity only
    const filled = await fillShippingIfPresent(page)
    record('fill_shipping', filled, page.url(), filled ? 'placeholder identity submitted' : 'no shipping form detected')

    if (remaining() <= 0) throw new FlowStop('timeout')

    await guardAgainstGates(page)
    if (await isPaymentGate(page)) {
      record('reach_payment_gate', true, page.url(), 'gate reached after fill_shipping')
      return {
        success: true,
        stoppedReason: 'payment_gate_reached',
        screenshotBase64: await screenshotPage(page),
        finalUrl: page.url(),
        steps,
        error: null,
      }
    }

    // Reached the end of the generic flow without finding a recognizable
    // payment gate. Return the last page reached as best-effort proof.
    record('reach_payment_gate', false, page.url(), 'no payment gate detected before flow ended')
    return {
      success: false,
      stoppedReason: 'payment_gate_not_found',
      screenshotBase64: await screenshotPage(page),
      finalUrl: page.url(),
      steps,
      error: null,
    }
  } catch (err) {
    const reason = err instanceof FlowStop ? err.reason : 'timeout'
    const screenshot = await screenshotPage(page).catch(() => null)
    return {
      success: false,
      stoppedReason: reason,
      screenshotBase64: screenshot,
      finalUrl: page.url(),
      steps,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    await context.close().catch(() => {})
  }
}

/**
 * Fills only guest-checkout / shipping fields with the fixed placeholder
 * identity. Never touches a payment field — the gate check before and after
 * this step guarantees we haven't reached one.
 */
async function fillShippingIfPresent(page: Page): Promise<boolean> {
  const fields: Array<[string, string]> = [
    ["input[name*='email' i]", PLACEHOLDER_IDENTITY.email],
    ["input[name*='name' i]:not([name*='user' i])", PLACEHOLDER_IDENTITY.name],
    ["input[name*='address1' i], input[name*='address' i]:not([name*='email' i])", PLACEHOLDER_IDENTITY.address1],
    ["input[name*='city' i]", PLACEHOLDER_IDENTITY.city],
    ["input[name*='zip' i], input[name*='postal' i]", PLACEHOLDER_IDENTITY.zip],
    ["input[name*='phone' i]", PLACEHOLDER_IDENTITY.phone],
  ]
  let any = false
  for (const [selector, value] of fields) {
    const locator = page.locator(selector).first()
    try {
      if ((await locator.count()) === 0) continue
      if (!(await locator.isVisible())) continue
      await locator.fill(value, { timeout: 3000 })
      any = true
    } catch {
      continue
    }
  }
  return any
}
