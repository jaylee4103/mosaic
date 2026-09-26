# Board and commerce API contract

This is the contract for Backend's endpoints under `apps/web/app/api/`. It is the source of truth for Frontend and AI while they integrate. Boards and board images are implemented today; vibe profile, products, and cart are shape-only until later milestones.

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
    "name": "Sun-Washed Mediterranean", "description": "...",
    "profile": { "colors": ["cream", "terracotta"], "materials": ["linen"], "qualities": ["warm"] },
    "updatedAt": "..."
  }
}
```
`vibeProfile` is `null` until the AI service (or a later step) writes one. `images[].url` is a signed URL valid for 1 hour — re-fetch the board to refresh it; never persist or share it long-term.
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

## Vibe profile (shape only — not yet implemented)

### `GET /api/boards/:boardId/vibe-profile`
Same shape as the `vibeProfile` field above, or `404` if none exists yet.

### `PUT /api/boards/:boardId/vibe-profile`
Request:
```json
{ "name": "Sun-Washed Mediterranean", "description": "...", "profile": { "colors": [...], "materials": [...], "qualities": [...] } }
```
`profile` is an arbitrary JSON object produced by the AI service (or edited by the user); Backend stores it as-is in `profile_json`.

## Products (shape only — not yet implemented)

### `GET /api/products/search?query=&category=&maxPrice=`
```json
{
  "products": [
    {
      "id": "...", "merchantId": "...", "merchantName": "...",
      "name": "Ceramic Bedside Lamp", "description": "...", "category": "lighting",
      "priceCents": 5500, "currency": "usd", "imageUrl": "...", "productUrl": "...", "available": true
    }
  ]
}
```
`maxPrice` is in cents. AI owns query generation and vibe-based ranking on top of these results.

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
