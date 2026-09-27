# Mosaic Supabase setup

`migrations/202609260001_core.sql` creates guest, board, image, Vibe Profile, merchant, product, cart, checkout, and order tables. `migrations/202609260002_demo_checkout_state.sql` adds durable state for the two-store Next.js demo checkout. `migrations/202609260003_checkout_payment_method.sql` adds verified payment method fields to merchant orders.

All three migrations were applied through the SQL Editor to the `mosaic` project (`qptyjlfydloegovtfhkb`) on September 26, 2026. The third migration's two columns were verified in `information_schema.columns`. All 12 tables were verified with row level security enabled and no `anon` or `authenticated` table access. The SQL Editor does not record CLI migration history, so do not rerun these migrations against this project.

The `mosaic-board-images` bucket is present in that project. It is private, has a 10 MB file limit, and accepts JPEG, PNG, and WebP.

The `mosaic-checkout-proofs` bucket stores PNG screenshots from `run_merchant_checkout` (browser-driven checkout proof — see `.spec/browser-checkout-proof.md`). It is private and accepts PNG only.

The demo catalog was seeded in that project with 2 test merchants and 14 products across home and fashion on September 26, 2026. Re-running `bun run seed:products` from `apps/web/` is safe because it upserts by merchant slug and product external ID.

## Set up another project

1. Apply all SQL files in filename order in the project's SQL Editor.
2. In Supabase Storage, create a private bucket named `mosaic-board-images`; restrict it to 10 MB JPEG, PNG, and WebP files. Also create a private bucket named `mosaic-checkout-proofs` restricted to PNG files.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the project URL and a **secret** API key. Keep the key on the Next.js server; never use a `NEXT_PUBLIC_` variable for it.
4. Start Next.js from `apps/web/`. `GET /api/guest` creates or resumes a guest session, and the demo checkout routes persist state in `demo_checkout_sessions`.

Mosaic has no sign-in screen. A guest receives a random 256-bit token in an HttpOnly, SameSite=Lax cookie for 30 days. Only its SHA-256 hash is stored in `guest_sessions`; production cookies are also Secure. A missing or expired token creates a new session.

All tables use row level security and deny direct browser-role access. The server secret key bypasses row level security, so every API route must resolve the guest cookie and scope its checkout query to that guest. The board image upload handlers (`apps/web/lib/server/board-images.ts`) write to `<guest-id>/<board-id>/<image-id>` paths and return short-lived (1 hour) signed URLs after checking board ownership; see `../docs/board-commerce-api.md` for the full board and image API contract.

The durable `demo_checkout_sessions` table is for the fixed two-store test fixture. It does not replace the catalog, cart, or order tables needed for the full Mosaic product.

## CI: automatic migrations on merge to main

`.github/workflows/supabase-migrations.yml` runs `supabase db push` against the hosted project whenever a merge to `main` touches `supabase/migrations/**`.

**Required repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | A personal access token from https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | `qptyjlfydloegovtfhkb` |
| `SUPABASE_DB_PASSWORD` | The project's Postgres password (Project Settings → Database) |

**One-time baseline required before this workflow is safe to run**: the six migrations already applied through the SQL Editor (see above) were never recorded in the CLI's migration-history table (`supabase_migrations.schema_migrations`). Running `supabase db push` as-is would try to re-apply all six and fail on `already exists` errors. Before merging anything that triggers this workflow, run once, locally, against this project:

```bash
supabase link --project-ref qptyjlfydloegovtfhkb
supabase migration repair --status applied \
  202609260001 202609260002 202609260003 \
  202609270001 202609270002 202609270003
```

`migration repair` only marks these versions as applied in the history table — it does not run their SQL again. After that, `supabase db push` (and this workflow) will only apply migrations newer than `202609270003`.
