# Mosaic Next.js API

The backend now runs in Next.js Route Handlers under `app/api/`. There is no separate Node HTTP server. Start the app from this directory with `bun install` and `bun dev`.

Copy `.env.example` to `.env.local` and set the Supabase project URL and **secret** API key. Keep the secret key on the server; do not prefix it with `NEXT_PUBLIC_`. Set `APP_BASE_URL` to the origin that Stripe should return to. For a new Supabase project, apply the SQL migrations in `../../supabase/migrations/` in filename order and create the private `mosaic-board-images` bucket as described in `../../supabase/README.md`.

| Route | Purpose |
| --- | --- |
| `GET /health` | Test server health |
| `GET /api/guest` | Create or resume an HttpOnly guest session |
| `GET /api/boards` | List the guest's boards |
| `POST /api/boards` | Create a board |
| `GET /api/boards/:boardId` | Get a board with signed image URLs and its vibe profile |
| `PATCH /api/boards/:boardId` | Rename a board |
| `DELETE /api/boards/:boardId` | Delete a board and its images |
| `POST /api/boards/:boardId/images` | Upload an image (`multipart/form-data`) to the private bucket |
| `PATCH /api/boards/:boardId/images/:imageId` | Update an image's note or position |
| `DELETE /api/boards/:boardId/images/:imageId` | Delete an image and its storage object |
| `POST /api/boards/:boardId/analyze` | Analyze the guest's stored private images with the ML service and save the Vibe Profile |
| `GET /api/boards/:boardId/vibe-profile` | Get the board's saved vibe profile |
| `PUT /api/boards/:boardId/vibe-profile` | Save the AI service's vibe result for a board (upsert) |
| `GET /api/products/search` | Search the demo product catalog by `query`, `category`, `maxPrice` (no guest cookie needed) |
| `GET /api/boards/:boardId/cart` | Get (or create) the board's cart, with live catalog pricing |
| `PATCH /api/boards/:boardId/cart` | Set or clear the cart's budget |
| `POST /api/boards/:boardId/cart/items` | Add a product to the cart |
| `PATCH /api/boards/:boardId/cart/items/:itemId` | Change a cart item's quantity or locked state |
| `DELETE /api/boards/:boardId/cart/items/:itemId` | Remove an item from the cart |
| `POST /api/boards/:boardId/cart/actions` | Apply a batch of AI-proposed cart actions (`ADD`/`REMOVE`/`REPLACE`/`LOCK`/`UNLOCK`/`SET_BUDGET`) |
| `POST /api/boards/:boardId/checkout` | Snapshot the real cart into merchant orders and start checkout |
| `GET /api/boards/:boardId/checkout` | Read the latest checkout and refresh local Link approvals when enabled |
| `POST /api/boards/:boardId/checkout/payments` | Create one hosted Stripe test Checkout Session per unpaid merchant |
| `GET /api/boards/:boardId/checkout/payments` | Verify each merchant payment and update order state |
| `GET /api/boards/:boardId/checkout/return` | Show the payment result after a hosted Stripe return |
| `GET /api/demo/cart` | Show the fixed $1 + $2 two-store test cart |
| `POST /api/demo/checkout` | Request separate Stripe Link test approvals |
| `GET /api/demo/checkout` | Refresh approval statuses |
| `POST /api/demo/checkout/complete` | Create separate **simulated**, unpaid test orders |
| `POST /api/demo/checkout/payments` | Create separate Stripe test Checkout Sessions after approvals |
| `GET /api/demo/checkout/payments` | Verify payment status and payment method with each test merchant |
| `GET /api/demo/checkout/return` | Show a payment summary after a Stripe return |

See `../../docs/board-commerce-api.md` for the board, image, vibe profile, product, cart, and checkout request/response contract.

Set `ML_SERVICE_URL` to the `apps/ml` service origin to enable board analysis (for local development, `http://127.0.0.1:8000`). The route downloads images server-side and returns the saved Vibe Profile; the browser does not need Supabase storage access.

Run `bun run seed:products` to (re-)populate the two-store demo product catalog that `/api/products/search` reads from.

Guest sessions and demo checkout state are stored in Supabase, so separate Next.js requests can resume the same cart. The second migration adds `demo_checkout_sessions` with an optimistic version check to reject conflicting writes. The browser roles have no direct access to these tables. The server secret key bypasses row level security, so each route resolves the guest cookie before loading checkout state.

## Local Link demo

The optional Link agent-wallet approval step depends on an interactive, authenticated `@stripe/link-cli` installed on the machine running Next. Run `bunx link-cli auth login` yourself and set `LINK_CLI_ENABLED=true` **only for local `bun dev`**. The Next Route Handler invokes that local CLI in test mode. It never retrieves payment credentials. Next deployment on Vercel cannot use this machine's authenticated CLI session; the fixed `/api/demo/checkout` approval routes return `501` in production. The real-cart board checkout uses hosted Stripe Checkout instead when the CLI is unavailable. A deployed agent-wallet flow still needs a supported server API and deployment credentials for Link.

The test purchase step needs `STRIPE_STORE_A_TEST_SECRET_KEY` and `STRIPE_STORE_B_TEST_SECRET_KEY` from two distinct Stripe test merchant accounts. They must remain server-only. The customer opens each hosted Stripe Checkout URL and completes each test purchase there. Link approvals alone do not charge either store. `POST /api/demo/checkout/complete` only creates local-style simulated receipts with `paymentStatus: not_charged`.

## Real-cart sandbox checkout

The board checkout routes use the saved cart and its product price snapshot. By default they create separate hosted Stripe Checkout Sessions for the two seeded merchants, so deployment does not need the local Link CLI. The customer still confirms each merchant purchase on Stripe. Set `LINK_CLI_ENABLED=true` during local development to request the extra agent-wallet approval step before payment; this path remains local-only. A deployable Link agent-wallet approval flow requires a supported server API and credentials. These routes are sandbox checkout, not physical retailer order placement or a one-charge multi-store purchase.

For a new database, apply `202609260003_checkout_payment_method.sql` before running the board checkout routes. It records the actual Stripe payment method and whether Link was verified. A paid card transaction is reported as paid with `linkVerified: false`.

This is a two-store test fixture. The board UI uses the board, image, vibe-analysis, product-search, and add-to-cart endpoints. Checkout screens and conversational cart editing are not wired yet. Merchant catalog ingestion, real retailer order placement, fulfillment, and a single charge covering unrelated stores still require separate integrations. A completed two-store Next API sandbox run is recorded in `../../docs/checkout-sandbox-verification.md`.
