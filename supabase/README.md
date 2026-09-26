# Mosaic Supabase setup

The migration in `migrations/202609260001_core.sql` creates the guest, board, image, Vibe Profile, merchant, product, cart, checkout, and order tables.

The schema was applied through the SQL Editor to the `mosaic` project (`qptyjlfydloegovtfhkb`) on September 26, 2026. All 11 tables were verified with row level security enabled and no `anon` or `authenticated` table access. The SQL Editor does not record this as a CLI migration, so do not rerun this initial migration against that project.

The `mosaic-board-images` bucket is present in that project. It is private, has a 10 MB file limit, and accepts JPEG, PNG, and WebP.

## Apply to a Supabase project

1. Create a Supabase project and run `migrations/202609260001_core.sql` in its SQL Editor.
2. Copy `backend/.env.example` to `backend/.env`. Set `SUPABASE_URL` and a **secret** API key from the project settings. Keep this key on the backend; do not use a `NEXT_PUBLIC_` variable.
3. From `backend/`, run `node --env-file=.env scripts/setup-storage.mjs`. This creates a private `mosaic-board-images` bucket restricted to JPEG, PNG, and WebP files up to 10 MB.
4. Start the backend with `node --env-file=.env src/server.mjs`. `GET /api/guest` creates or resumes a guest session and sets its cookie.

## Guest sessions

Mosaic has no sign-in screen. On the first request, the backend creates a random 256-bit token and puts it in an HttpOnly, SameSite=Lax cookie for 30 days. Only its SHA-256 hash is stored in `guest_sessions`. In production the cookie is also Secure. A missing or expired token creates a new guest session.

Board, cart, and checkout rows carry a `guest_session_id`; future API handlers must resolve the cookie and filter every query by that ID. The migration enables row level security and removes browser-role access to these tables. Only the backend secret key can read or write them. The backend must perform the ownership checks because that key bypasses row level security.

The image bucket is private. Future upload handlers should write paths such as `<guest-id>/<board-id>/<image-id>` and return short-lived signed URLs after checking board ownership. Do not expose the secret key or raw storage paths as public image URLs.

The current two-store checkout demo still saves its test session in `backend/.local`; moving it to the new checkout and order tables is the next integration step.
