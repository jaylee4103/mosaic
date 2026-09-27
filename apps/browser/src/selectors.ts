// Ordered fallback chains. First matching, visible, enabled element wins.
// Per-merchant overrides (merchants.checkout_selectors) can be spliced in
// ahead of these by the caller — see .spec/browser-checkout-proof.md §6.

export const ADD_TO_CART_PATTERNS = [
  "button[name='add']", // Shopify default
  "button[data-testid*='add-to-cart' i]",
  "button:has-text('Add to cart')",
  "button:has-text('Add to Bag')",
  "input[value*='Add to Cart' i]",
  '#add-to-cart-button', // WooCommerce default id
  'button.single_add_to_cart_button', // WooCommerce class
]

export const CHECKOUT_PATTERNS = [
  "a[href*='/checkout' i]",
  "button:has-text('Checkout')",
  "a:has-text('Proceed to Checkout')",
  "button[name='checkout']",
]

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
