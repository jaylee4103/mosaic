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
| `GET /api/boards/:boardId/vibe-profile` | Get the board's saved vibe profile |
| `PUT /api/boards/:boardId/vibe-profile` | Save the AI service's vibe result for a board (upsert) |
| `GET /api/products/search` | Search the demo product catalog by `query`, `category`, `maxPrice` (no guest cookie needed) |
| `GET /api/demo/cart` | Show the fixed $1 + $2 two-store test cart |
| `POST /api/demo/checkout` | Request separate Stripe Link test approvals |
| `GET /api/demo/checkout` | Refresh approval statuses |
| `POST /api/demo/checkout/complete` | Create separate **simulated**, unpaid test orders |
| `POST /api/demo/checkout/payments` | Create separate Stripe test Checkout Sessions after approvals |
| `GET /api/demo/checkout/payments` | Verify payment status and payment method with each test merchant |
| `GET /api/demo/checkout/return` | Show a payment summary after a Stripe return |

See `../../docs/board-commerce-api.md` for the full board, image, vibe profile, product, and cart request/response contract.

Run `bun run seed:products` to (re-)populate the two-store demo product catalog that `/api/products/search` reads from.

Guest sessions and demo checkout state are stored in Supabase, so separate Next.js requests can resume the same cart. The second migration adds `demo_checkout_sessions` with an optimistic version check to reject conflicting writes. The browser roles have no direct access to these tables. The server secret key bypasses row level security, so each route resolves the guest cookie before loading checkout state.

## Local Link demo

The Link approval step currently depends on an interactive, authenticated `@stripe/link-cli` installed on the machine running Next. Run `bunx link-cli auth login` yourself and set `LINK_CLI_ENABLED=true` **only for local `bun dev`**. The Next Route Handler invokes that local CLI in test mode. It never retrieves payment credentials. Next deployment on Vercel cannot use this machine's authenticated CLI session; the approval routes return `501` in production. A deployed agent-wallet flow needs a supported server API and deployment credentials for Link.

The test purchase step needs `STRIPE_STORE_A_TEST_SECRET_KEY` and `STRIPE_STORE_B_TEST_SECRET_KEY` from two distinct Stripe test merchant accounts. They must remain server-only. The customer opens each hosted Stripe Checkout URL and completes each test purchase there. Link approvals alone do not charge either store. `POST /api/demo/checkout/complete` only creates local-style simulated receipts with `paymentStatus: not_charged`.

This is a two-store test fixture. Product search, merchant catalog ingestion, real retailer order placement, fulfillment, and a single charge covering unrelated stores still require separate integrations. The current UI is not wired to these endpoints.
