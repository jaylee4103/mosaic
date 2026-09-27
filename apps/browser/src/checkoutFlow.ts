import type { Page } from 'playwright'
import { getBrowser } from './browserInstance'
import { isCaptchaPage, isPaymentGate } from './checkoutGate'
import { decideNextAction } from './navigatorAgent'
import type { CheckoutFlowOptions, CheckoutFlowResult, CheckoutStep } from './types'

const STEP_TIMEOUT_MS = 10_000
const FLOW_TIMEOUT_MS = 120_000
const MAX_AGENT_STEPS = 12

class FlowStop extends Error {
  constructor(
    public readonly reason: CheckoutFlowResult['stoppedReason'],
    message?: string,
  ) {
    super(message ?? reason)
  }
}

async function guardAgainstGates(page: Page): Promise<void> {
  if (await isCaptchaPage(page)) throw new FlowStop('captcha_detected', 'CAPTCHA or bot-check page detected')
}

async function screenshotPage(page: Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false, type: 'png' })
  return buffer.toString('base64')
}

function gateResult(page: Page, steps: CheckoutStep[], detail: string): Promise<CheckoutFlowResult> {
  steps.push({ step: 'gate_check', success: true, url: page.url(), detail })
  return screenshotPage(page).then((screenshotBase64) => ({
    success: true,
    stoppedReason: 'payment_gate_reached',
    screenshotBase64,
    finalUrl: page.url(),
    steps,
    error: null,
  }))
}

export async function runCheckoutFlow(options: CheckoutFlowOptions): Promise<CheckoutFlowResult> {
  const steps: CheckoutStep[] = []
  const hints = [...(options.addToCartSelectors ?? []), ...(options.checkoutSelectors ?? [])]

  console.log(`[checkout-flow] starting: url=${options.productUrl} quantity=${options.quantity ?? 1} hints=${hints.length}`)

  const browser = await getBrowser()
  const context = await browser.newContext()
  const page = await context.newPage()

  const deadline = Date.now() + FLOW_TIMEOUT_MS

  try {
    await page.goto(options.productUrl, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT_MS })
    console.log(`[checkout-flow] loaded product page: ${page.url()}`)

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      await guardAgainstGates(page)
      if (await isPaymentGate(page)) {
        console.log(`[checkout-flow] payment gate detected at step ${step}: ${page.url()}`)
        return await gateResult(page, steps, 'payment gate detected')
      }
      if (Date.now() > deadline) throw new FlowStop('timeout')

      const snapshot = await page.locator('body').ariaSnapshot({ mode: 'ai' })
      const prompt = hints.length > 0 ? `${snapshot}\n\nKnown-good elements on this merchant: ${hints.join(', ')}` : snapshot
      console.log(`[checkout-flow] step ${step}: requesting decision (snapshot ${snapshot.length} chars)`)
      const decision = await decideNextAction(prompt, page.url())
      console.log(`[checkout-flow] step ${step}: decided ${decision.action}${decision.ref ? ` ref=${decision.ref}` : ''}${decision.value ? ` value=${JSON.stringify(decision.value)}` : ''} — ${decision.reasoning}`)

      if (decision.action === 'goal_reached') {
        console.log(`[checkout-flow] model reports goal reached at step ${step}: ${page.url()}`)
        return await gateResult(page, steps, decision.reasoning)
      }
      if (decision.action === 'stuck') throw new FlowStop('stuck', decision.reasoning)
      if (!decision.ref) throw new FlowStop('stuck', `Model chose ${decision.action} with no target ref`)

      const target = page.locator(`aria-ref=${decision.ref}`)
      try {
        if (decision.action === 'click') {
          await target.click({ timeout: STEP_TIMEOUT_MS })
        } else if (decision.action === 'select') {
          if (decision.value === undefined) throw new Error('select action missing a value')
          await target.selectOption(decision.value, { timeout: STEP_TIMEOUT_MS }).catch(() => target.click({ timeout: STEP_TIMEOUT_MS }))
        } else if (decision.action === 'fill') {
          if (decision.value === undefined) throw new Error('fill action missing a value')
          await target.fill(decision.value, { timeout: STEP_TIMEOUT_MS })
        }
        steps.push({ step: decision.action, success: true, url: page.url(), detail: decision.reasoning })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[checkout-flow] step ${step}: action ${decision.action} on ${decision.ref} failed: ${message}`)
        steps.push({ step: decision.action, success: false, url: page.url(), detail: message })
      }

      await page.waitForLoadState('domcontentloaded', { timeout: STEP_TIMEOUT_MS }).catch(() => {})
      await page.waitForTimeout(500)
    }

    // Exhausted the step budget without reaching a gate — return the last
    // page reached as best-effort proof rather than a hard error.
    console.warn(`[checkout-flow] exhausted ${MAX_AGENT_STEPS} steps without reaching a gate: ${page.url()}`)
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
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[checkout-flow] stopped: reason=${reason} url=${page.url()} error=${message}`)
    const screenshot = await screenshotPage(page).catch(() => null)
    return {
      success: false,
      stoppedReason: reason,
      screenshotBase64: screenshot,
      finalUrl: page.url(),
      steps,
      error: message,
    }
  } finally {
    await context.close().catch(() => {})
    console.log(`[checkout-flow] finished: url=${options.productUrl}`)
  }
}
