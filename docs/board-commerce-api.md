# Board and commerce API contract

This is the contract for Backend's endpoints under `apps/web/app/api/`. It is the source of truth for Frontend and AI while they integrate. Boards, board images, the vibe profile, and product search are implemented today; cart is shape-only until a later milestone.

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
    "profile": { "phrase": "Sun-Washed Mediterranean", "facets": { "...": "..." }, "confidence": 0.83, "mixed": false, "target_domain": null, "message": null },
    "updatedAt": "..."
  }
}
```
`vibeProfile` is `null` until AI writes one via `PUT /api/boards/:boardId/vibe-profile` (see below for the real shape). `images[].url` is a signed URL valid for 1 hour — re-fetch the board to refresh it; never persist or share it long-term.
`404 { "code": "NOT_FOUND" }` if the board doesn't exist or belongs to another guest.

### `PATCH /api/boards/:boardId`
Request: `{ "name": "New name" }`. Response `200` with the updated board (list-item shape).

### `DELETE /api/boards/:boardId`
Deletes the board, its images (DB rows and storage objects), and its vibe profile. Response `200 { "ok": true }`.

## Board images

### `POST /api/boards/:boardId/images`
`multipart/form-data` with:
- `image` (required): a JPEG, PNG, or WebP file, up to 10 MB.
- `note` (optional): a string annotation, e.g. "I like the colors, not the furniture."

Response `201`, same shape as an entry in `GET /api/boards/:boardId`'s `images` array.

### `PATCH /api/boards/:boardId/images/:imageId`
Request (both fields optional): `{ "note": "updated note", "position": 2 }`. Response `200` with the updated image.

### `DELETE /api/boards/:boardId/images/:imageId`
Removes the storage object and the row. Response `200 { "ok": true }`.

## Vibe profile

Backend does not define the shape of a vibe profile — it stores and returns exactly what `apps/ml`'s `VibeResult` produces (`apps/ml/app/models/vibe.py`), keys as-is (snake_case included). If AI changes that model's fields, no Backend change is required; the new fields just flow through.

### `GET /api/boards/:boardId/vibe-profile`
Response `200`:
```json
{
  "name": "Sun-Washed Mediterranean",
  "description": null,
  "profile": {
    "phrase": "Sun-Washed Mediterranean",
    "facets": {
      "style_archetype": "coastal", "material": "linen", "color_tone": "warm", "era_mood": "timeless",
      "color_palette": "warm earth tones", "texture_quality": "natural", "light_quality": "golden",
      "energy_mood": "calm", "density_complexity": "balanced",
      "confidence": { "style_archetype": 0.82, "material": 0.71 }
    },
    "confidence": 0.83, "mixed": false, "target_domain": null, "message": null
  },
  "updatedAt": "..."
}
```
`404 { "code": "NOT_FOUND" }` if the board has no saved vibe profile yet (or isn't yours).

### `PUT /api/boards/:boardId/vibe-profile`
Request body: **exactly the `vibe` object from `apps/ml`'s `POST /api/vibe/analyze` response** (`{ phrase, facets, confidence, mixed, target_domain, message }`), forwarded unmodified. Upserts one profile per board. Response `200`, same shape as the `GET` above.

Backend only reads two fields out of the body for the `name`/`description` columns already required by the schema: `phrase` → `name` (empty string if absent), `message` → `description` (`null` if absent). Everything else — including `facets` — is stored verbatim in `profile` and is not validated or reshaped.

## Products

This is the `searchProducts(query, category, maxPrice)` interface from the root README's "Product discovery" section, provider-agnostic by design: today it queries a seeded two-store demo catalog (`apps/web/scripts/seed-products.ts`), but the response shape is meant to stay stable if the underlying provider changes later (a real merchant feed, marketplace API, etc.).

This endpoint does **not** require or set the guest cookie — the catalog isn't guest-scoped, so it's a plain unauthenticated read.

### `GET /api/products/search?query=&category=&maxPrice=`
All query params are optional.
- `query`: case-insensitive substring match against the product name.
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

## Cart (shape only — not yet implemented)

### `GET /api/cart?boardId=`
```json
{
  "id": "...", "boardId": "...", "budgetCents": 30000, "currency": "usd", "status": "open",
  "items": [{ "id": "...", "productId": "...", "quantity": 1, "locked": false, "subtotalCents": 5500 }],
  "totalCents": 5500, "remainingCents": 24500
}
```

### `POST /api/cart/items`
Request: `{ "boardId": "...", "productId": "...", "quantity": 1 }`. Server validates the product and price against the catalog.

### `PATCH /api/cart/items/:itemId`
Request (either field optional): `{ "quantity": 2, "locked": true }`.

### `DELETE /api/cart/items/:itemId`
Removes the item from the cart.

### `PATCH /api/cart`
Request: `{ "budgetCents": 25000 }`.
