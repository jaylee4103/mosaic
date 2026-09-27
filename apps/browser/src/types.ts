export type StoppedReason =
  | 'payment_gate_reached'
  | 'payment_gate_not_found'
  | 'stuck'
  | 'captcha_detected'
  | 'login_required'
  | 'timeout'
  | 'disallowed_by_robots'

// Steps are now the navigator agent's own actions (click/select/fill on a
// given [ref=eN], or a gate check), not a fixed named sequence — see
// navigatorAgent.ts. `detail` carries the model's one-line reasoning.
export interface CheckoutStep {
  step: 'click' | 'select' | 'fill' | 'gate_check'
  success: boolean
  url: string
  detail: string | null
}

export interface CheckoutFlowResult {
  success: boolean
  stoppedReason: StoppedReason
  screenshotBase64: string | null
  finalUrl: string
  steps: CheckoutStep[]
  error: string | null
}

export interface CheckoutFlowOptions {
  productUrl: string
  quantity?: number
  /** Per-merchant hints passed to the navigator agent's prompt (e.g. known-good element text), not deterministic selectors. */
  addToCartSelectors?: string[]
  checkoutSelectors?: string[]
}
