# Running Mosaic locally

Three services, each with its own local env file. Nothing is shared across
them — no root `.env`, no Turborepo. Set each one up once, then use
`scripts/dev.sh` to start everything together.

## 1. One-time setup per service

### apps/web (Next.js, port 3000)

```bash
cd apps/web
bun install
cp .env.example .env.local   # if not already present
```

Fill in `apps/web/.env.local`:

| Var | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | project URL |
| `SUPABASE_SECRET_KEY` | yes | service-role key — server-only, never `NEXT_PUBLIC_` |
| `OPENROUTER_API_KEY` or `META_MODEL_API_KEY` | one of these | picked by `AGENT_PROVIDER` |
| `AGENT_PROVIDER` | no | defaults to the OpenRouter provider |
| `AGENT_MODEL_ID` | no | has a built-in default per provider |
| `SERPER_API_KEY` | yes | internet product search |
| `SEARCH_QUERY_COUNT` | no | defaults `5` — max search queries generated per shopping-agent turn |
| `SEARCH_ITEMS_PER_QUERY` | no | defaults `10` — max products fetched per search query |
| `ML_SERVICE_URL` | no | defaults `http://localhost:8000` |
| `BROWSER_SERVICE_URL` | no | defaults `http://localhost:8100` |
| `STRIPE_STORE_A_TEST_SECRET_KEY` / `STRIPE_STORE_B_TEST_SECRET_KEY` | yes | demo Stripe checkout, one per seeded merchant |
| `APP_BASE_URL` | yes | this app's own public URL — used for Stripe return URLs and for the product links the shopping agent shows in its replies |
| `LINK_CLI_ENABLED` | no | set `'true'` to enable the Stripe Link CLI dev tool (non-production only) |

Seed the demo catalog once: `bun run seed:products`.

### apps/ml (FastAPI, port 8000)

```bash
cd apps/ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
./start.sh   # auto-copies .env.example -> .env on first run
```

Add `OPENROUTER_API_KEY` to `apps/ml/.env` to enable the decision layer (the
service runs without it, with reduced functionality).

### apps/browser (Bun + Playwright, port 8100)

```bash
cd apps/browser
bun install   # postinstall runs `playwright install --with-deps chromium`
```

No required env vars. `PORT` overrides the default 8100 if needed.

### Supabase

Two options:
- **Hosted** (what this repo's own dev/demo setup uses): create a project,
  apply `supabase/migrations/*.sql` in filename order via the SQL Editor, and
  create two private Storage buckets — `mosaic-board-images` (10 MB,
  JPEG/PNG/WebP) and `mosaic-checkout-proofs` (PNG only). See
  `supabase/README.md`.
- **Local**: `supabase start` (uses `supabase/config.toml`) — API on
  `:54321`, Studio on `:54323`, Postgres on `:54322`. You still need to apply
  the migrations and create the two buckets yourself; the CLI doesn't do
  either automatically for a fresh local stack.

Either way, the resulting URL + service-role key go into
`apps/web/.env.local` as `SUPABASE_URL` / `SUPABASE_SECRET_KEY`.

## 2. Start everything

```bash
./scripts/dev.sh                # assumes a hosted Supabase project
./scripts/dev.sh --with-supabase  # also runs `supabase start` first
```

Starts `apps/ml`, `apps/browser`, and `apps/web` together, each in the
background, logging to `.dev-logs/{ml,browser,web}.log`. Ctrl+C stops all
three.

Health checks:
- ML service: http://localhost:8000/health
- Browser service: http://localhost:8100/health
- Web app: http://localhost:3000

Order matters a little: `apps/web` calls the other two by URL
(`ML_SERVICE_URL`, `BROWSER_SERVICE_URL`), so if those aren't up yet, the
first search/checkout-proof request just fails and can be retried once they
are — nothing needs a strict startup order.
