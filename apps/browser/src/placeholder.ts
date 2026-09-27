// Fixed, obviously-fake identity used only to progress past guest-checkout /
// shipping forms that gate the payment step. Never entered into a payment
// field — the flow structurally cannot reach one (see checkoutGate.ts).
export const PLACEHOLDER_IDENTITY = {
  name: 'Mosaic Test',
  email: 'checkout-proof@mosaic.test',
  address1: '123 Test Street',
  city: 'Testville',
  state: 'CA',
  zip: '94000',
  country: 'US',
  phone: '555-0100',
} as const
