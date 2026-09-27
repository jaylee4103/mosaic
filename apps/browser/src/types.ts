export type StoppedReason =
  | 'payment_gate_reached'
  | 'payment_gate_not_found'
  | 'selector_not_found'
  | 'captcha_detected'
  | 'login_required'
  | 'timeout'
  | 'disallowed_by_robots'

export type CheckoutStepName =
  | 'add_to_cart'
  | 'open_cart'
  | 'begin_checkout'
  | 'fill_shipping'
  | 'reach_payment_gate'

export interface CheckoutStep {
  step: CheckoutStepName
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
  /** Per-merchant overrides, tried before the generic pattern lists. */
  addToCartSelectors?: string[]
  checkoutSelectors?: string[]
}
