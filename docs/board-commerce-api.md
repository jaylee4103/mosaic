# Board and commerce API contract

This is the contract for Backend's endpoints under `apps/web/app/api/`. It is the source of truth for Frontend and AI while they integrate. Boards, board images, the vibe profile, product search, and the cart are implemented today.

## Conventions

- **Base URL**: same origin as the Next.js app (e.g. `http://127.0.0.1:3000`). There is no separate backend service or CORS to configure.
- **Auth**: every endpoint transparently resolves or creates a guest session from the `mosaic_guest` HttpOnly cookie. There is no login step — always call with `credentials: "include"` from the browser, and the first response sets the cookie if the client didn't already have one.
- **Money**: all prices and budgets are **integer cents** (e.g. `2500` = $25.00), matching the database (`price_cents`, `budget_cents`). Never send or expect floating-point dollar amounts.
- **Errors**: non-2xx responses return
  ```json
  { "error": "Human readable message", "code": "MACHINE_CODE" }
  ```
  Known codes: `VALIDATION` (400), `NOT_FOUND` (404), `SUPABASE_NOT_CONFIGURED` (503), `INTERNAL_ERROR` (502, message is generic to avoid leaking internals).
- **Delete responses**: `DELETE` endpoints return `200 { "ok": true }`, not `204`, so the guest cookie can still be attached if needed.
- **Timestamps**: ISO 8601 strings (`createdAt`, `updatedAt`).

## Boards

### `GET /api/boards`
Lists the current guest's boards, most recently created first.
```json
{ "boards": [{ "id": "...", "name": "Dream Apartment", "createdAt": "...", "updatedAt": "..." }] }
```

### `POST /api/boards`
Request:
```json
{ "name": "Dream Apartment" }
```
`name` must be 1–120 characters. Response `201` with the created board (same shape as a list item).

### `GET /api/boards/:boardId`
Response `200`:
```json
{
  "id": "...", "name": "Dream Apartment", "createdAt": "...", "updatedAt": "...",
  "images": [
    { "id": "...", "url": "https://...signed...", "note": "cozy corner", "position": 0, "createdAt": "..." }
  ],
  "vibeProfile": {
    "name": "Sun-Washed Mediterranean", "description": null,
    "profile": { "phrase": "Sun-Washed Mediterranean", "facets": { "color": ["terracotta", "cream"], "material": ["linen"] }, "mixed": false, "target_domain": null, "message": null },
    "updatedAt": "..."
  }
}
```
`vibeProfile` is `null` until analysis writes one through `POST /api/boards/:boardId/analyze` or a caller saves one through `PUT /api/boards/:boardId/vibe-profile`. `images[].url` is a signed URL valid for 1 hour — re-fetch the board to refresh it; never persist or share it long-term.
`404 { "code": "NOT_FOUND" }` if the board doesn't exist or belongs to another guest.

### `PATCH /api/boards/:boardId`
Request: `{ "name": "New name" }`. Response `200` with the updated board (list-item shape).

### `DELETE /api/boards/:boardId`
Deletes the board, its images (DB rows and storage objects), and its vibe profile. Response `200 { "ok": true }`.

## Board images

### `POST /api/boards/:boardId/images`
`multipart/form-data` with:
- `image` (required): a JPEG, PNG, or WebP file, up to 4 MB.
- `note` (optional): a string annotation, e.g. "I like the colors, not the furniture."

Response `201`, same shape as an entry in `GET /api/boards/:boardId`'s `images` array.

### `PATCH /api/boards/:boardId/images/:imageId`
Request (both fields optional): `{ "note": "updated note", "position": 2 }`. Response `200` with the updated image.

### `DELETE /api/boards/:boardId/images/:imageId`
Removes the storage object and the row. Response `200 { "ok": true }`.

## Vibe profile

Backend stores and returns the `VibeResult` from `apps/ml/app/models/vibe.py` without reshaping it. The analysis bridge checks that `phrase` is a string, `facets` is an object, and `mixed` is a boolean before saving. Changes to those required fields need a matching bridge update.

### `POST /api/boards/:boardId/analyze`
Reads the current guest's private board images, sends them to `apps/ml`'s `POST /api/vibe/analyze`, and saves the returned vibe profile. Call this after the user finishes uploading or changing images. The Next server needs `ML_SERVICE_URL` set to the ML service origin (for example `http://127.0.0.1:8000`). Request body is empty. Response `200`:
```json
{ "vibeProfile": { "name": "Sun-Washed Mediterranean", "description": null, "profile": { "phrase": "Sun-Washed Mediterranean", "facets": { "color": ["terracotta", "cream"], "material": ["linen"] }, "mixed": false, "target_domain": null, "message": null }, "updatedAt": "..." } }
```
An empty board returns `400 VALIDATION`; an unreachable or invalid ML response returns `503 ML_UNAVAILABLE`. If images or notes change during analysis, the endpoint returns `409 BOARD_CHANGED` instead of saving a stale result. The ML service currently analyzes image pixels; image notes are stored on the board but are not yet part of its analysis model.

### `POST /api/boards/:boardId/analyze/mock`
Request JSON: `{ "scenario": "mediterranean" }`, `{ "scenario": "alpine" }`, or `{ "scenario": "random" }`. The server calls `apps/ml`'s `POST /api/vibe/mock/analyze?scenario=...` and saves its sample Vibe Profile. Response matches `POST /analyze`: `{ "vibeProfile": { ... } }`. No board images are required; the ML mock ignores uploaded images. This overwrites any existing saved profile, and the result should be treated as demo data. Invalid scenarios return `400 VALIDATION`; an unavailable or invalid mock response returns `503 ML_UNAVAILABLE`.

### `GET /api/boards/:boardId/vibe-profile`
Response `200`:
```json
{
  "name": "Sun-Washed Mediterranean",
  "description": null,
  "profile": {
    "phrase": "Sun-Washed Mediterranean",
    "facets": {
      "style": ["coastal"], "material": ["linen"], "color": ["terracotta", "cream"],
      "quality": ["natural", "calm"]
    },
    "mixed": false, "target_domain": null, "message": null
  },
  "updatedAt": "..."
}
```
`404 { "code": "NOT_FOUND" }` if the board has no saved vibe profile yet (or isn't yours).

### `PUT /api/boards/:boardId/vibe-profile`
Request body: **exactly the `vibe` object from `apps/ml`'s `POST /api/vibe/analyze` response** (`{ phrase, facets, mixed, target_domain, message }`), forwarded unmodified. Each facet is a ranked list of tags. Upserts one profile per board. Response `200`, same shape as the `GET` above.

Backend only reads two fields out of the body for the `name`/`description` columns already required by the schema: `phrase` → `name` (empty string if absent), `message` → `description` (`null` if absent). Everything else — including `facets` — is stored verbatim in `profile` and is not validated or reshaped.

## Products

This is the `searchProducts(query, category, maxPrice)` interface from the root README's "Product discovery" section, provider-agnostic by design: today it queries a seeded two-store demo catalog (`apps/web/scripts/seed-products.ts`), but the response shape is meant to stay stable if the underlying provider changes later (a real merchant feed, marketplace API, etc.).

This endpoint does **not** require or set the guest cookie — the catalog isn't guest-scoped, so it's a plain unauthenticated read.

### `GET /api/products/search?query=&category=&maxPrice=`
All query params are optional.
- `query`: case-insensitive word matching against product name, description, and category; a generated multi-word phrase returns candidates matching the most words in the small demo catalog. This is lexical candidate retrieval, not vibe ranking.
- `category`: case-insensitive exact match (e.g. `lighting`, `furniture`, `decor`, `textiles`).
- `maxPrice`: in cents; excludes products priced above it.

Only `available: true` products are returned. Response `200`:
```json
{
  "products": [
    {
      "id": "...", "merchantId": "...", "merchantName": "Sol & Clay",
      "name": "Ceramic Bedside Lamp", "description": "...", "category": "lighting",
      "priceCents": 5500, "currency": "usd", "imageUrl": null, "productUrl": "...", "available": true
    }
  ]
}
```
AI owns query generation and vibe-based ranking on top of these results.

### `POST /api/boards/:boardId/chat`
Request JSON: `{ "message": "Find a warm lamp under $100" }`. The shopping agent reads the saved board vibe and cart, searches the demo catalog, chooses products, and applies cart actions immediately. Response `200`:
```json
{ "assistantMessage": "Added a ceramic lamp that matches your board.", "cart": { "...": "full updated cart" }, "steps": 3 }
```
The board UI uses the returned `cart` directly, so no product selection step is required. The server needs `OPENROUTER_API_KEY` for the default provider or `META_MODEL_API_KEY` with `AGENT_PROVIDER=meta`; missing configuration returns `503 AGENT_UNAVAILABLE`.

## Cart

Each board has exactly one open cart, created automatically on first access — there's no separate "create cart" call. Item prices are **always resolved from the live `products` catalog**, never from the client or a cached value, so totals reflect the current catalog even if a price changes after an item was added. Every mutation endpoint returns the full, freshly recomputed cart (not just the changed item), so the client always has up-to-date totals.

### `GET /api/boards/:boardId/cart`
Gets (creating if needed) the board's cart. Response `200`:
```json
{
  "id": "...", "boardId": "...", "currency": "usd", "budgetCents": 30000, "status": "open",
  "items": [
    {
      "id": "...", "productId": "...", "quantity": 1, "locked": false, "subtotalCents": 5500,
      "product": { "id": "...", "merchantId": "...", "merchantName": "Sol & Clay", "name": "Ceramic Bedside Lamp", "priceCents": 5500, "currency": "usd", "available": true, "...": "..." }
    }
  ],
  "totalCents": 5500, "remainingCents": 24500
}
```
`budgetCents` and `remainingCents` (`budgetCents - totalCents`) are `null` until a budget is set. `product` is `null` if the product was later removed from the catalog entirely (rare; an unavailable-but-still-listed product still resolves normally).

### `PATCH /api/boards/:boardId/cart`
Request: `{ "budgetCents": 25000 }` (or `{ "budgetCents": null }` to clear it). Response `200`, full cart.

### `POST /api/boards/:boardId/cart/items`
Request: `{ "productId": "...", "quantity": 1 }` (`quantity` optional, defaults to `1`, 1–99). Response `201`, full cart. `404 NOT_FOUND` if the product doesn't exist or isn't `available`; `400 VALIDATION` if the product is already in the cart (use `PATCH` on the existing item instead of adding it twice).

### `PATCH /api/boards/:boardId/cart/items/:itemId`
Request (either field optional): `{ "quantity": 2, "locked": true }`. Response `200`, full cart. `404 NOT_FOUND` if the item isn't in this board's cart.

### `DELETE /api/boards/:boardId/cart/items/:itemId`
Response `200`, full cart (not `{ "ok": true }` — the point is to hand back fresh totals after removal).

## Cart actions

This is where "the AI decides what it wants to change; deterministic application code decides whether and how the change actually occurs" (root README) is enforced. The shopping agent proposes a batch of actions; Backend applies each independently — one invalid or blocked action does not fail the others — and returns both the per-action outcomes and the resulting cart.

Actions reference products by **`productId`**, not the internal cart item id, since that's what the agent reasons about.

### `POST /api/boards/:boardId/cart/actions`
Request: `{ "actions": [ ... ] }`, 1–20 actions, each one of:
```json
{ "type": "ADD", "productId": "...", "quantity": 1 }
{ "type": "REMOVE", "productId": "..." }
{ "type": "REPLACE", "removeProductId": "...", "addProductId": "...", "quantity": 1 }
{ "type": "LOCK", "productId": "..." }
{ "type": "UNLOCK", "productId": "..." }
{ "type": "SET_BUDGET", "budgetCents": 25000 }
```
`quantity` is optional on `ADD`/`REPLACE` (defaults to `1`). `SEARCH` is intentionally not an action here — it doesn't mutate the cart, so call `GET /api/products/search` directly, then submit `ADD` actions for whatever the agent decides to add.

Response `200`:
```json
{
  "results": [
    { "type": "LOCK", "ok": true },
    { "type": "REMOVE", "ok": false, "error": "Cannot change a locked item; unlock it first", "code": "LOCKED" }
  ],
  "cart": { "...": "the full cart, same shape as GET /api/boards/:boardId/cart" }
}
```
Server-enforced rules: `ADD`/`REPLACE` still validate the product exists and is `available` (404) and reject duplicates (400), same as the plain cart endpoints. `REMOVE` and the outgoing side of `REPLACE` are rejected with `code: "LOCKED"` if the target item is locked — the agent must `UNLOCK` it first. `SET_BUDGET` is never blocked by the current total (an over-budget cart is a UI/agent concern, not a hard server constraint).

A malformed body (not `{ actions: [...] }`), an empty `actions` array, or more than 20 actions is a request-level `400 VALIDATION` (the whole request fails, not per-action). A board owned by another guest is a request-level `404 NOT_FOUND`, checked once up front.

## Two-store sandbox checkout

`POST /api/boards/:boardId/checkout` snapshots the current cart into one order per merchant, then locks the cart. The response contains `id`, `boardId`, `cartId`, `status`, `totalCents`, `currency`, `approvalMode`, and `merchantOrders`. Each merchant order reports `amountCents`, `paymentStatus`, `paymentMethodType`, and `linkVerified`. `approvalMode` is `hosted_checkout` by default. With the local `LINK_CLI_ENABLED=true` development setting, it is `link_cli` and Link spend-request approvals are required first.

`GET /api/boards/:boardId/checkout` returns the latest checkout, including after payment completes. In local CLI mode it also refreshes pending approvals.

`POST /api/boards/:boardId/checkout/payments` creates or resumes a hosted Stripe **test** Checkout Session for each unpaid merchant and includes each `checkoutUrl` in the response. The customer opens each URL and approves that merchant payment on Stripe. Item names, quantities, and prices come from the snapshot taken when checkout started. A paid merchant is skipped on retry.

`GET /api/boards/:boardId/checkout/payments` verifies each Stripe Checkout Session and PaymentIntent with that merchant's test account. One paid store and one unpaid store yield `status: "partial"`. Once both are paid, the checkout and cart become `completed`; the next cart request creates a fresh cart. A card payment is recorded as paid but has `linkVerified: false`; Link use is only claimed when Stripe confirms its payment method is Link.

If an unpaid Stripe Checkout Session expires, another `POST /checkout/payments` creates a new test session for that merchant only. A transient verification error is reported on that merchant order and can be retried by refreshing payment status. These retries do not create a second session for a merchant already recorded as paid.

New board checkout sessions return the browser to `/boards/:boardId?merchant=...` after Stripe. The board UI calls `GET /checkout/payments` to verify the payment and then loads the current cart. `GET /api/boards/:boardId/checkout/return` remains available as a JSON status endpoint for earlier sessions. No physical retailer order is placed. The hosted route works without the local Link CLI, but a deployed agent-wallet approval flow still requires a supported server API and credentials.
