# Run Mosaic on a Windows PC

The Windows PC runs two Linux containers through Docker Desktop's WSL 2 backend:

- `web`: Next.js, including the shopping agent, cart, and Stripe test checkout, on `http://127.0.0.1:3000`
- `ml`: FastAPI image analysis and page browsing at `http://ml:8000` inside Compose, with a loopback-only host port at `http://127.0.0.1:8000`

This starts with CPU inference. The ML Dockerfile currently installs a CPU-only PyTorch wheel, even if the PC has an NVIDIA GPU.

## 1. Install Docker Desktop

In an Administrator PowerShell window, run `wsl --install` if WSL is missing, then reboot. Install Docker Desktop for Windows from Docker's official site and select its WSL 2 backend and Linux containers. Check `docker --version` and `docker compose version` in PowerShell.

## 2. Get the project and set server secrets

Clone the deployment branch, then open PowerShell in the repository directory:

```powershell
git clone --branch vyang/feat-checkout-conversation-ui https://github.com/vyang2968/mosaic.git
cd mosaic
Copy-Item apps/web/.env.example apps/web/.env.local
notepad apps/web/.env.local
```

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `OPENROUTER_API_KEY` to the existing Mosaic values. For local checkout testing, add the two distinct Stripe test merchant keys. Leave `ML_SERVICE_URL` alone in the file: Compose overrides it with the private `http://ml:8000` address. Set `APP_BASE_URL=http://127.0.0.1:3000` for local testing. Keep `.env.local` out of Git and do not paste its contents into chat.

Before exposing ML through a tunnel, generate an independent service token in the repository's ignored root `.env` file. Compose passes it to both containers. Never commit or paste this file:

```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$token = [Convert]::ToHexString($bytes).ToLowerInvariant()
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), "ML_SERVICE_TOKEN=$token`n")
```

## 3. Start and check the services

```powershell
docker compose up --build -d
docker compose ps
Invoke-WebRequest http://127.0.0.1:3000/boards
docker compose logs --tail=100 web ml
```

Open `http://127.0.0.1:3000/boards` in the PC's browser. Create a test board, use a mock vibe profile, and send a shopping request. Upload an image and analyze it to test the real ML model. The first real analysis downloads SigLIP2 model files into the persistent `ml-models` volume and may take longer than later requests. The ML port is bound only to PC loopback. Its API requires the shared token when `ML_SERVICE_TOKEN` is set; `/health` stays available for health checks.

To stop or restart:

```powershell
docker compose down
docker compose up -d
```

## 4. Run Next.js on Vercel and expose ML with Cloudflare Tunnel

Follow [Vercel with a Windows PC ML service](vercel-pc-ml.md). Vercel runs the Next.js site and shopping agent. Cloudflare Tunnel forwards only the PC's token-protected ML service; port 3000 stays local.

## Notes

- The PC must stay on, connected, and running Docker Desktop for the site to work.
- The shopping agent is part of Next.js; it is not a separate VM or service. It calls OpenRouter using the server-side API key.
- The GTX 1660 Super is not used by this baseline ML container. GPU acceleration requires a separate CUDA-enabled image and a working NVIDIA driver/WSL 2 setup.
- No router port forwarding is needed for Cloudflare Tunnel.
