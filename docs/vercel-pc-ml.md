# Vercel Next.js with ML on a Windows PC

Vercel hosts `apps/web` (including the shopping agent). The Windows PC keeps the CPU-based FastAPI ML container running. The optional Cloudflare Tunnel container forwards an HTTPS hostname to ML inside Compose. The web server sends a bearer token with every ML request; the ML service rejects requests without it. No router port forwarding is needed.

## Prepare the PC

Start from the deployment branch, which includes the latest `main` changes. Keep `apps/web/.env.local` and the root `.env` file on the PC; both are ignored by Git. Generate `ML_SERVICE_TOKEN` in the root `.env` as described in [Windows PC server setup](windows-pc-server.md). If that file already contains a token, keep it so the Vercel value continues to match.

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

## Configure Vercel

Use the existing Vercel `mosaic` project, which is already connected to GitHub with **Root Directory** set to `apps/web`. Push `vyang/feat-checkout-conversation-ui` for a Preview deployment until its changes are merged into `main`; keep the project's production branch on `main`. Set these **server-side** environment variables for the Preview environment in Vercel; do not add `NEXT_PUBLIC_` to any secret:

| Variable | Value |
| --- | --- |
| `ML_SERVICE_URL` | The Cloudflare HTTPS origin, with no trailing path |
| `ML_SERVICE_TOKEN` | The value of `ML_SERVICE_TOKEN` in the PC's ignored root `.env` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Existing Mosaic Supabase server values |
| `OPENROUTER_API_KEY` | Existing server key for the shopping agent |
| `AGENT_PROVIDER`, `AGENT_MODEL_ID` | Same values as local `apps/web/.env.local` |
| `STRIPE_STORE_A_TEST_SECRET_KEY`, `STRIPE_STORE_B_TEST_SECRET_KEY` | Existing distinct Stripe test keys when testing checkout |
| `APP_BASE_URL` | Exact Vercel site origin used for Stripe return links |
| `SERPER_API_KEY` | Optional, for internet product search |
| `LINK_CLI_ENABLED` | `false` unless deliberately configured |

The project already has an `OPENROUTER_API_KEY` for Preview; verify that it is the intended existing server key. Add the other values in the Vercel dashboard without placing them in Git or chat. Use the preview branch's exact URL for `APP_BASE_URL`. Redeploy after changing variables. If a Quick Tunnel URL changes, update `ML_SERVICE_URL` and redeploy. A stable named tunnel avoids this step.

## Verify

Open the Vercel `/boards` page. Create a disposable board, upload an image under 4 MB, and run real analysis. Vercel limits Function request bodies to 4.5 MB, so the app enforces a 4 MB image limit to leave room for multipart overhead. The browser uploads to the Vercel route; Next.js reads the private image from Supabase and sends it to ML through Cloudflare. Test a shopping request and Stripe test checkout separately. Keep the PC on, Docker Desktop running, and the tunnel connected while using the Vercel site.

The merged `main` branch also adds browser-assisted checkout proof through a **separate** `apps/browser` service. It is not part of this two-service Compose setup, so that specific proof action needs its own deployment and `BROWSER_SERVICE_URL` before it can work on Vercel. The normal board analysis, shopping agent, cart, and Stripe test checkout use the setup above.
