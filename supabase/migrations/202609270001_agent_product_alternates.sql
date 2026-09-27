-- Runner-up candidates from a product search that the shopping agent didn't
-- add to the cart, kept so a later "swap this out" request (a separate HTTP
-- turn — Next.js routes are stateless per request, so nothing in-process
-- survives between turns) can serve the next-best match instead of
-- re-searching from scratch. Keyed by (board_id, product_id) — product_id
-- is the item currently occupying that cart "slot", matching the existing
-- productId-addressed CartAction scheme (see lib/server/cart-actions.ts)
-- rather than introducing a new cart_item-based key.
create table if not exists public.agent_product_alternates (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alternate_product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, product_id)
);

alter table public.agent_product_alternates enable row level security;
