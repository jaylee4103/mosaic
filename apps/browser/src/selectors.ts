// Any match trips the hard-stop payment gate (.spec §8). Checked before every
// click in the flow, not just once — a Checkout click can land directly on a
// payment page with no intermediate step.
export const PAYMENT_GATE_SELECTORS = [
  "iframe[src*='stripe' i]",
  "iframe[name*='braintree' i]",
  "iframe[src*='paypal' i]",
  "input[name*='card' i]",
  "input[autocomplete='cc-number']",
  "input[autocomplete='cc-csc']",
]

export const PAYMENT_GATE_BUTTON_TEXT = [
  'Place Order',
  'Pay Now',
  'Complete Purchase',
  'Buy Now',
  'Submit Payment',
]

export const CAPTCHA_TEXT_PATTERNS = [/verify you are human/i, /captcha/i, /are you a robot/i]
