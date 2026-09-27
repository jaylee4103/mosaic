# Browser Checkout Proof — Spec

> **Status:** Draft v1
> **Branch:** `vyang/feat-internet-product-search`
> **Date:** 2026-09-27

---

## 1. Problem Statement

Cart items from internet product search (`checkout_method: 'browser'` merchants — see `.spec/internet-product-search.md`) live on arbitrary third-party retailer sites, not in Mosaic's own Stripe-backed checkout (`lib/server/checkout.ts`, which only covers the two seeded test merchants `sol-and-clay` / `north-loom`).

For a `browser` merchant there is no API integration. The agent must instead **drive the actual merchant website**: open the product page, add to cart, walk the site's own checkout flow, and stop one step before the page that would submit a real payment. At that point it captures a screenshot as proof the flow works end-to-end.

**Hard constraint: never submit a real purchase.** No payment form submission, no "Place Order" / "Pay now" click, ever. The deliverable is a screenshot of the last page before that action — e.g. the reviewed-cart / payment-details page.

---

## 2. Scope

In scope:
- One cart item → one merchant site → one screenshot proof, per merchant group in the cart (mirrors `groupCartForCheckout` in `checkout.ts`)
- Generic (selector-heuristic) automation that works across common storefront platforms (Shopify, WooCommerce, generic HTML forms)
- Storing the screenshot + a structured trace of the steps taken, surfaced back to the user in the Mosaic UI
- Hard-stop safety gate before any page that looks like a real payment-submission step

Out of scope (future work):
- Actually completing a purchase
- Per-merchant bespoke adapters beyond a small allowlist of hand-tuned selector sets
- Solving CAPTCHAs / bot-detection challenges — if hit, the run fails cleanly and reports why
- Multi-item-per-merchant-site carts where the site requires login to persist cart state across page loads (see §9 Open Questions)

---

## 3. Where This Fits

```
apps/web (Next.js)                          apps/ml (FastAPI + Playwright)
─────────────────────                        ──────────────────────────────
shoppingTools.ts                              browser_service.py
  browse_webpage ───────────┐                   browse(url)
  browse_summary ────────────┼─── HTTP ────►     browse_summary(url)
  start_merchant_checkout ───┘                   NEW: run_checkout_flow(steps)
       │
       ▼
lib/server/browserCheckout.ts (NEW)
  - loads cart, groups by merchant (reuse groupCartForCheckout)
  - for each browser-method merchant group:
      POST {ML_SERVICE_URL}/api/browse/checkout
      persist screenshot + trace to Postgres
       │
       ▼
checkout_proofs table (NEW) ── read by ── /app/api/boards/[boardId]/checkout/proof (NEW route)
                                              │
                                              ▼
                                        UI renders screenshot + step trace
```

The existing `checkout.ts` Stripe flow is untouched. This is a parallel path specifically for `merchants.checkout_method = 'browser'`.

---

## 4. Agent-Facing Tool

Add one tool to `shoppingTools.ts`, alongside `browse_webpage` / `browse_summary`:

```ts
run_merchant_checkout: tool({
  description: `Attempt to add a cart item's product to its merchant's real site cart and
walk their checkout flow up to (but never past) the payment-submission step. Returns a
screenshot proving the flow reached checkout, or an error if a step failed. Never completes
a real purchase.`,
  inputSchema: z.object({ productId: z.string() }),
  execute: logged('run_merchant_checkout', async ({ productId }) => {
    return await runMerchantCheckout(boardId, productId, db)
  }),
}),
```

The agent calls this per cart item (or the user asks "prove you can check these out" and the agent loops over cart items). It does not run automatically on `add_item` — checkout automation is slower and riskier than a cart mutation, so it stays an explicit, separate step.

---

## 5. Browser Automation Steps (ML service)

New function in `apps/ml/app/services/browser_service.py`, new route in `apps/ml/app/routes/`.

```python
async def run_checkout_flow(product_url: str, quantity: int = 1) -> CheckoutFlowResult:
    """
    1. Navigate to product_url
    2. Find + click an "Add to Cart" control (selector heuristics, §6)
    3. Navigate to the site's cart page (heuristics, or the site auto-redirects)
    4. Find + click a "Checkout" control
    5. Walk forward through checkout steps (shipping info / guest checkout) using
       placeholder data (§7) ONLY where required to reach the payment step —
       never fill real payment fields
    6. STOP at the first page that contains a payment-submission gate (§8)
    7. Screenshot that page, return it + a step-by-step trace
    """
```

**Result shape:**

```python
class CheckoutStep(TypedDict):
    step: str            # "add_to_cart" | "open_cart" | "begin_checkout" | "fill_shipping" | "reach_payment_gate"
    success: bool
    url: str
    detail: str | None   # e.g. which selector matched, or why it failed

class CheckoutFlowResult(TypedDict):
    success: bool                 # True iff it reached the payment gate without submitting
    stopped_reason: str           # "payment_gate_reached" | "selector_not_found" | "captcha_detected" | "timeout" | "login_required"
    screenshot_base64: str | None # PNG of the final page reached
    final_url: str
    steps: list[CheckoutStep]
    error: str | None
```

Each step is attempted with a bounded timeout (10s) and a bounded total flow timeout (60s). Any step failure stops the flow immediately and returns what was captured so far — a partial trace is still useful proof-of-work, not a hard error.

---

## 6. Selector Heuristics ("Add to Cart" / "Checkout")

No merchant-specific adapter is required for the MVP. Use an ordered list of common selector/text patterns, trying each until one matches a visible, enabled element:

```python
ADD_TO_CART_PATTERNS = [
    "button[name='add']",                       # Shopify default
    "button[data-testid*='add-to-cart' i]",
    "button:has-text('Add to cart')",
    "button:has-text('Add to Bag')",
    "input[value*='Add to Cart' i]",
    "#add-to-cart-button",                       # WooCommerce default id
    "button.single_add_to_cart_button",          # WooCommerce class
]

CHECKOUT_PATTERNS = [
    "a[href*='/checkout' i]",
    "button:has-text('Checkout')",
    "a:has-text('Proceed to Checkout')",
    "button[name='checkout']",
]
```

This mirrors Playwright's own recommended `:has-text` / role-based fallback-chain pattern already available in the installed Playwright version (`apps/ml/.venv/.../playwright-tests.md` skill references this style). If every pattern in a list fails, the step fails with `selector_not_found` and the trace records which patterns were tried.

A small **per-merchant override table** (keyed by `merchants.slug`) can supply a tuned selector list where the generic heuristics are known to fail — stored as a JSON column (`merchants.checkout_selectors`, nullable) rather than a code adapter, so it's a data fix, not a deploy.

---

## 7. Guest / Shipping Step Data

Some sites require a shipping address or guest-checkout email before showing the payment step. Use a **fixed, obviously-fake placeholder identity** — never the real user's data (Mosaic has no real user address to give anyway; guest sessions are anonymous per `.spec/internet-product-search.md` §12):

```
name:    Mosaic Test
email:   checkout-proof@mosaic.test
address: 123 Test Street, Testville, CA 94000, US
phone:   555-0100
```

This block lives in `apps/ml/app/services/checkout_placeholder.py` as a constant, documented as **placeholder-only, must never reach a real payment processor** since the flow always stops before that point.

---

## 8. The Payment Gate (Hard Stop)

Before interacting with any field, check whether the current page is a **payment-submission page**. Heuristics, any one of which trips the gate:

- Presence of a Stripe/Braintree/PayPal iframe (`iframe[src*='stripe']`, `iframe[name*='braintree']`, etc.)
- A form field for card number / CVV (`input[name*='card' i]`, `input[autocomplete='cc-number']`)
- Button text matching `Place Order`, `Pay Now`, `Complete Purchase`, `Buy Now`, `Submit Payment`

The moment the gate trips, the flow **stops, screenshots, and returns success** — this page *is* the proof, not an obstacle to click past. No form fill and no click ever happens on this page. This check runs before every click in steps 4–6, not just once, since a "Checkout" click can land directly on a payment page with no intermediate steps.

---

## 9. Data Model

```sql
create table public.checkout_proofs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id),
  guest_session_id text not null,
  product_id uuid not null references public.products(id),
  merchant_id uuid not null references public.merchants(id),
  success boolean not null,
  stopped_reason text not null,
  final_url text not null,
  screenshot_url text,        -- uploaded to Supabase Storage, not stored inline
  steps_json jsonb not null,  -- CheckoutStep[]
  error text,
  created_at timestamptz not null default now()
);
```

Screenshots go to Supabase Storage (a `checkout-proofs` bucket), not inline base64 in Postgres — the ML service returns base64, the web app uploads it and stores only the resulting URL.

---

## 10. API Surface

| Endpoint | Method | Description |
|---|---|---|
| `POST {ML_SERVICE_URL}/api/browse/checkout` | ML service, internal | `{ productUrl, quantity }` → `CheckoutFlowResult` |
| `apps/web/lib/server/browserCheckout.ts::runMerchantCheckout(boardId, productId, db)` | server function | Orchestrates: load product/merchant, call ML endpoint, upload screenshot, insert `checkout_proofs` row |
| `GET /api/boards/[boardId]/checkout/proof` | Next.js route (NEW) | List proofs for the board, for UI display |
| `run_merchant_checkout` tool | agent tool | Wraps `runMerchantCheckout`, returns result to the agent/chat |

---

## 11. Error Handling

| Scenario | Behavior |
|---|---|
| "Add to cart" selector not found | Fail step, return partial trace, `stopped_reason: 'selector_not_found'` |
| Site requires login before cart persists | Fail with `stopped_reason: 'login_required'`, no retry |
| CAPTCHA / bot-check page detected (title/text match `verify you are human`, `captcha`) | Fail immediately, `stopped_reason: 'captcha_detected'` |
| Flow exceeds 60s total | Abort, return steps captured so far, `stopped_reason: 'timeout'` |
| Payment gate never appears before checkout flow ends (e.g. free-item checkout) | Treat final reachable page as best-effort proof; `success: false`, `stopped_reason: 'payment_gate_not_found'` |
| ML service unreachable | Tool returns `{ ok: false, error: 'browser service unavailable' }`, no partial DB row |
| Merchant is not `checkout_method: 'browser'` | Tool rejects immediately — this flow is only for browser-checkout merchants; Stripe merchants use the existing `checkout.ts` path |

---

## 12. Security & Safety

- **No real payment data ever entered.** Placeholder identity only (§7); the flow structurally cannot reach a card-entry action because the gate check (§8) runs before every click.
- Headless browser runs server-side only (ML service), same sandboxed Chromium already used for `browse_webpage`/`browse_summary` — no new browser surface.
- Screenshots may contain the merchant's page chrome/ads; stored in a private Supabase bucket, not public.
- Rate-limit `run_merchant_checkout` per board (e.g. max 5 calls per cart per hour) to avoid hammering third-party sites and triggering their bot defenses.
- If a merchant site's `robots.txt` disallows the checkout path, skip and report `stopped_reason: 'disallowed_by_robots'` rather than proceeding.

---

## 13. Acceptance Criteria

1. **[ ]** `run_merchant_checkout` tool exists and is callable by the shopping agent for any cart item whose merchant has `checkout_method = 'browser'`
2. **[ ]** Given a real product URL, the flow adds the item to the merchant's cart and proceeds to checkout using generic selector heuristics
3. **[ ]** The flow stops before any payment-submission page and never fills or submits payment fields
4. **[ ]** A screenshot of the stopping page is captured, uploaded to Supabase Storage, and linked from a `checkout_proofs` row
5. **[ ]** The step trace (`steps_json`) records every attempted step, success/failure, and selector used
6. **[ ]** CAPTCHA, login-required, and selector-not-found cases fail cleanly with a specific `stopped_reason`, not a crash
7. **[ ]** Merchants using Stripe checkout (`sol-and-clay`, `north-loom`) are rejected by this tool — they use the existing `checkout.ts` flow instead
8. **[ ]** Per-merchant selector overrides can be added via `merchants.checkout_selectors` without a code change
9. **[ ]** No real purchase is ever completed by this flow, under any input

---

## 14. Open Questions

1. **Multi-item same-merchant carts**: does each item get its own isolated browser session (simpler, but the site cart won't show all items together in one screenshot) or one session adding all items from that merchant before checkout (more realistic proof, more fragile)? Leaning toward per-merchant session adding all its cart items, since that's what a real checkout would look like — matches `groupCartForCheckout`'s grouping.
2. **Session/cookie reuse across a `run_merchant_checkout` retry**: should a failed run be resumable from where it stopped, or always restart from the product page? Start with always-restart (simpler, stateless); revisit if flows are slow enough to matter.
3. **Screenshot format**: full-page vs viewport-only. Viewport-only is what a user actually saw; full-page is more thorough proof. Default to viewport (matches "here's what the page looked like at that moment").
4. **How does the UI surface this?** Likely a small "Proof" badge/thumbnail on each cart item once `run_merchant_checkout` succeeds — deferred to implementation, not blocking this spec.
