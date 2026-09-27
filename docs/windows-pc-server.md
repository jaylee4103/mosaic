# Run Mosaic on a Windows PC

The Windows PC runs two Linux containers through Docker Desktop's WSL 2 backend:

- `web`: Next.js, including the shopping agent, cart, and Stripe test checkout, on `http://127.0.0.1:3000`
- `ml`: FastAPI image analysis, reachable only by `web` at `http://ml:8000`

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

## 3. Start and check the services

```powershell
docker compose up --build -d
docker compose ps
Invoke-WebRequest http://127.0.0.1:3000/boards
docker compose logs --tail=100 web ml
```

Open `http://127.0.0.1:3000/boards` in the PC's browser. Create a test board, use a mock vibe profile, and send a shopping request. Upload an image and analyze it to test the real ML model. The first real analysis downloads SigLIP2 model files into the persistent `ml-models` volume and may take longer than later requests. The web server never exposes port 8000 to the LAN or internet.

To stop or restart:

```powershell
docker compose down
docker compose up -d
```

## 4. Share a demo over HTTPS

For a public demo, install Tailscale on the PC, enable Funnel for the tailnet, then run `tailscale funnel --bg 3000` in PowerShell. It prints an HTTPS address. Set `APP_BASE_URL` in `apps/web/.env.local` to that exact origin, then run `docker compose up -d --force-recreate web`. Use the HTTPS address for Stripe test checkout return links.

Funnel makes the web app reachable by anyone with its URL. Keep it local until you intend to share the demo. To turn public sharing off, use `tailscale funnel reset`.

## Notes

- The PC must stay on, connected, and running Docker Desktop for the site to work.
- The shopping agent is part of Next.js; it is not a separate VM or service. It calls OpenRouter using the server-side API key.
- The GTX 1660 Super is not used by this baseline ML container. GPU acceleration requires a separate CUDA-enabled image and a working NVIDIA driver/WSL 2 setup.
- No router port forwarding is needed when using Tailscale Funnel.
