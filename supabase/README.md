# Mosaic Supabase setup

`migrations/202609260001_core.sql` creates guest, board, image, Vibe Profile, merchant, product, cart, checkout, and order tables. `migrations/202609260002_demo_checkout_state.sql` adds durable state for the two-store Next.js demo checkout.

Both migrations were applied through the SQL Editor to the `mosaic` project (`qptyjlfydloegovtfhkb`) on September 26, 2026. All 12 tables were verified with row level security enabled and no `anon` or `authenticated` table access. The SQL Editor does not record CLI migration history, so do not rerun either migration against this project.

The `mosaic-board-images` bucket is present in that project. It is private, has a 10 MB file limit, and accepts JPEG, PNG, and WebP.

## Set up another project

1. Apply both SQL files in filename order in the project's SQL Editor.
2. In Supabase Storage, create a private bucket named `mosaic-board-images`; restrict it to 10 MB JPEG, PNG, and WebP files.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the project URL and a **secret** API key. Keep the key on the Next.js server; never use a `NEXT_PUBLIC_` variable for it.
4. Start Next.js from `apps/web/`. `GET /api/guest` creates or resumes a guest session, and the demo checkout routes persist state in `demo_checkout_sessions`.

Mosaic has no sign-in screen. A guest receives a random 256-bit token in an HttpOnly, SameSite=Lax cookie for 30 days. Only its SHA-256 hash is stored in `guest_sessions`; production cookies are also Secure. A missing or expired token creates a new session.

All tables use row level security and deny direct browser-role access. The server secret key bypasses row level security, so every API route must resolve the guest cookie and scope its checkout query to that guest. The private image bucket should use paths such as `<guest-id>/<board-id>/<image-id>` and short-lived signed URLs after checking board ownership.

The durable `demo_checkout_sessions` table is for the fixed two-store test fixture. It does not replace the catalog, cart, or order tables needed for the full Mosaic product.
