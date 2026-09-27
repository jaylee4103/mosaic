#!/bin/bash
# Starts all three Mosaic services for local dev: apps/ml (:8000),
# apps/browser (:8100), apps/web (:3000). Each service still reads its own
# local .env file — see docs/local-dev.md for what each one needs.
#
# Usage: ./scripts/dev.sh [--with-supabase]
#   --with-supabase   also run `supabase start` first (local Postgres/Storage
#                     instead of a hosted project)

set -e
cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"
LOG_DIR="$ROOT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"

pids=()

cleanup() {
  echo ""
  echo "Stopping services..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [ "$1" == "--with-supabase" ]; then
  if ! command -v supabase >/dev/null 2>&1; then
    echo "supabase CLI not found — install it or drop --with-supabase to use a hosted project" >&2
    exit 1
  fi
  echo "Starting local Supabase..."
  supabase start
fi

start_service() {
  local name="$1" dir="$2" cmd="$3"
  echo "Starting $name ($cmd in $dir)..."
  (cd "$ROOT_DIR/$dir" && eval "$cmd") >"$LOG_DIR/$name.log" 2>&1 &
  pids+=($!)
}

start_service "ml" "apps/ml" "./start.sh"
start_service "browser" "apps/browser" "bun run dev"
start_service "web" "apps/web" "bun run dev"

echo ""
echo "All services starting. Logs: $LOG_DIR/{ml,browser,web}.log"
echo "  ML service:      http://localhost:8000/health"
echo "  Browser service: http://localhost:8100/health"
echo "  Web app:         http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop everything."

wait
