import type { Page } from 'playwright'
import { CAPTCHA_TEXT_PATTERNS, PAYMENT_GATE_BUTTON_TEXT, PAYMENT_GATE_SELECTORS } from './selectors'

/**
 * True if the current page looks like a real payment-submission step.
 * Must be checked before every click in the checkout flow — never just once —
 * since a single click can land directly on this page with no intermediate
 * steps. When true, the flow must stop, screenshot, and return: this page IS
 * the proof, not an obstacle to click past.
 */
export async function isPaymentGate(page: Page): Promise<boolean> {
  for (const selector of PAYMENT_GATE_SELECTORS) {
    if (await page.locator(selector).first().count()) return true
  }
  for (const text of PAYMENT_GATE_BUTTON_TEXT) {
    if (await page.getByRole('button', { name: text, exact: false }).first().count()) return true
  }
  return false
}

export async function isCaptchaPage(page: Page): Promise<boolean> {
  const title = await page.title().catch(() => '')
  const bodyText = await page.locator('body').innerText().catch(() => '')
  const haystack = `${title} ${bodyText}`
  return CAPTCHA_TEXT_PATTERNS.some((pattern) => pattern.test(haystack))
}
