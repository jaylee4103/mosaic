-- Browser-driven checkout proof: see .spec/browser-checkout-proof.md. Cart
-- items whose merchant is checkout_method='browser' have no API integration
-- the agent can call, so the agent instead drives the merchant's real site
-- via apps/browser (Playwright), stopping with a screenshot right before any
-- payment-submission page. This table records one attempt per (board,
-- product); a later attempt for the same pair replaces the earlier row
-- rather than accumulating a history, since only the latest proof matters.
create table if not exists public.checkout_proofs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  guest_session_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  success boolean not null,
  stopped_reason text not null,
  final_url text not null,
  screenshot_path text,
  steps_json jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now(),
  unique (board_id, product_id)
);

alter table public.checkout_proofs enable row level security;

-- Per-merchant selector overrides for the generic add-to-cart / checkout
-- heuristics in apps/browser/src/selectors.ts, so a site the generic
-- patterns fail on can be fixed with a data change instead of a deploy.
-- Shape: { "addToCart": string[], "checkout": string[] }
alter table public.merchants add column if not exists checkout_selectors jsonb;
