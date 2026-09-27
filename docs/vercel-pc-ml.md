# Vercel Next.js with ML and checkout browser on a Windows PC

Vercel hosts `apps/web` (including the shopping agent). The Windows PC keeps CPU-based FastAPI ML and the optional Bun/Playwright checkout browser running. Separate Cloudflare Tunnel containers forward HTTPS hostnames to ML and the browser inside Compose. Each service requires its own bearer token. No router port forwarding is needed.

## Prepare the PC

Start from the browser-service branch (or `main` after it is merged). Keep `apps/web/.env.local` and the root `.env` file on the PC; both are ignored by Git. Generate `ML_SERVICE_TOKEN` and a separate `BROWSER_SERVICE_TOKEN` in the root `.env` as described in [Windows PC server setup](windows-pc-server.md). Keep existing tokens so the Vercel values continue to match.

In PowerShell, from the repository root:

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:8000/health
```

Check that a request without the token is rejected, then check one authorized mock analysis without printing the token:

```powershell
try { Invoke-WebRequest -Method Post http://127.0.0.1:8000/api/vibe/mock/analyze?scenario=alpine -ErrorAction Stop } catch { $_.Exception.Response.StatusCode.value__ }
$token = ((Get-Content .env | Where-Object { $_ -like 'ML_SERVICE_TOKEN=*' }) -split '=', 2)[1]
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/vibe/mock/analyze?scenario=alpine' -Headers @{ Authorization = "Bearer $token" }
```

The first command should print `401`; the second should return a `vibe` object. Do not paste `$token` or `.env` into chat.

## Start a temporary Cloudflare Tunnel

Start the optional tunnel container and read its generated URL from the logs:

```powershell
docker compose --profile tunnel up -d tunnel
docker compose logs --tail=100 tunnel
```

Copy only the generated `https://....trycloudflare.com` URL. Anyone can reach that URL, but ML endpoints still require the bearer token. This testing URL changes when the tunnel container restarts and Cloudflare does not guarantee Quick Tunnel uptime. For a stable demo, add a domain to Cloudflare, create a named tunnel, and route a hostname such as `ml.example.com` to `http://ml:8000` using a named tunnel connector in Compose. The Quick Tunnel command is only for testing.

Stop public access with `docker compose --profile tunnel stop tunnel`.

To expose browser-assisted checkout proof, start its separate service and Quick Tunnel:

```powershell
docker compose --profile browser up --build -d browser
docker compose --profile browser --profile browser-tunnel up -d browser-tunnel
docker compose logs --tail=100 browser-tunnel
```

Copy only the **browser tunnel's** `https://....trycloudflare.com` URL into Vercel as `BROWSER_SERVICE_URL`. It differs from the ML tunnel URL. Unauthenticated checkout requests must return `401`; the browser service accepts only the private `BROWSER_SERVICE_TOKEN` from Next.js. Its `/health` endpoint remains public for checks. Stop public browser access with `docker compose --profile browser --profile browser-tunnel stop browser-tunnel`.

## Configure Vercel

Use the existing Vercel `mosaic` project, which is connected to GitHub with **Root Directory** set to `apps/web`. Push the browser-service branch for Preview until it is merged into `main`; keep the project's production branch on `main`. Set these **server-side** environment variables for Preview, and for Production once the branch is merged; do not add `NEXT_PUBLIC_` to any secret:

| Variable | Value |
| --- | --- |
| `ML_SERVICE_URL` | The Cloudflare HTTPS origin, with no trailing path |
| `ML_SERVICE_TOKEN` | The value of `ML_SERVICE_TOKEN` in the PC's ignored root `.env` |
| `BROWSER_SERVICE_URL` | The **browser** Cloudflare HTTPS origin, with no trailing path |
| `BROWSER_SERVICE_TOKEN` | The value of `BROWSER_SERVICE_TOKEN` in the PC's ignored root `.env` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Existing Mosaic Supabase server values |
| `OPENROUTER_API_KEY` | Existing server key for the shopping agent |
| `AGENT_PROVIDER`, `AGENT_MODEL_ID` | Same values as local `apps/web/.env.local` |
| `STRIPE_STORE_A_TEST_SECRET_KEY`, `STRIPE_STORE_B_TEST_SECRET_KEY` | Existing distinct Stripe test keys when testing checkout |
| `APP_BASE_URL` | Exact Vercel site origin used for Stripe return links |
| `SERPER_API_KEY` | Optional, for internet product search |
| `LINK_CLI_ENABLED` | `false` unless deliberately configured |

The project already has an `OPENROUTER_API_KEY` for Preview and Production; verify that it is the intended existing server key. Add the new browser values in the Vercel dashboard without placing them in Git or chat. Use the preview branch's exact URL for Preview `APP_BASE_URL` and the public site origin for Production. Redeploy after changing variables. If either Quick Tunnel URL changes, update its corresponding service URL and redeploy. Stable named tunnels avoid this step.

Before shopping or checkout proof can work, apply the pending `supabase/migrations/202609270001_agent_product_alternates.sql`, `202609270002_internet_search_source_column.sql`, and `202609270003_checkout_proofs.sql` to the existing Mosaic Supabase project in filename order. The first three September 26 migrations were already applied; do not rerun them. Create the private `mosaic-checkout-proofs` Storage bucket restricted to PNG images if it does not exist. See [Supabase setup](../supabase/README.md).

## Verify

Open the Vercel `/boards` page. Create a disposable board, upload an image under 4 MB, and run real analysis. Vercel limits Function request bodies to 4.5 MB, so the app enforces a 4 MB image limit to leave room for multipart overhead. The browser uploads to the Vercel route; Next.js reads the private image from Supabase and sends it to ML through Cloudflare. Test a shopping request and Stripe test checkout separately. Keep the PC on, Docker Desktop running, and the tunnel connected while using the Vercel site.

Browser-assisted checkout proof is a separate action for merchants whose checkout method is `browser`; Stripe test checkout remains on the web server. The browser service stops before payment submission and returns a screenshot and step trace. Verify the browser tunnel rejects requests without its token before testing the agent action.
