-- Mosaic's API uses a server secret key. Browser roles have no direct access.
create extension if not exists pgcrypto;

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references public.guest_sessions(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, guest_session_id)
);

create table public.board_images (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  note text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create table public.vibe_profiles (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null unique references public.boards(id) on delete cascade,
  name text not null,
  description text,
  profile_json jsonb not null check (jsonb_typeof(profile_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website_url text,
  checkout_method text not null default 'manual'
    check (checkout_method in ('manual', 'browser', 'api', 'test')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id),
  external_id text not null,
  name text not null,
  description text,
  category text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  image_url text,
  product_url text,
  available boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  updated_at timestamptz not null default now(),
  unique (merchant_id, external_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references public.guest_sessions(id) on delete cascade,
  board_id uuid,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  budget_cents integer check (budget_cents is null or budget_cents >= 0),
  status text not null default 'open'
    check (status in ('open', 'checkout', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, guest_session_id),
  foreign key (board_id, guest_session_id)
    references public.boards(id, guest_session_id)
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1 check (quantity between 1 and 99),
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null,
  guest_session_id uuid not null references public.guest_sessions(id) on delete cascade,
  client_request_id text not null,
  mode text not null default 'test' check (mode in ('test', 'live')),
  status text not null default 'awaiting_approval'
    check (status in ('awaiting_approval', 'approved', 'partial', 'completed', 'failed')),
  total_cents integer not null check (total_cents >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (cart_id, guest_session_id)
    references public.carts(id, guest_session_id),
  unique (cart_id, client_request_id)
);

create table public.merchant_orders (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null references public.checkout_sessions(id),
  merchant_id uuid not null references public.merchants(id),
  link_spend_request_id text unique,
  external_order_id text,
  idempotency_key text not null unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'submitted', 'confirmed', 'failed', 'test_order_created')),
  payment_status text not null default 'not_started'
    check (payment_status in ('not_started', 'authorized', 'paid', 'failed', 'not_charged')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_session_id, merchant_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null references public.merchant_orders(id),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$')
);

create index boards_guest_session_idx on public.boards (guest_session_id);
create index board_images_board_idx on public.board_images (board_id, position);
create index products_merchant_idx on public.products (merchant_id, available);
create index carts_guest_session_idx on public.carts (guest_session_id, status);
create index cart_items_cart_idx on public.cart_items (cart_id);
create index checkout_sessions_guest_idx on public.checkout_sessions (guest_session_id, created_at desc);
create index merchant_orders_checkout_idx on public.merchant_orders (checkout_session_id);
create index order_items_order_idx on public.order_items (merchant_order_id);

alter table public.guest_sessions enable row level security;
alter table public.boards enable row level security;
alter table public.board_images enable row level security;
alter table public.vibe_profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.merchant_orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table
  public.guest_sessions, public.boards, public.board_images, public.vibe_profiles,
  public.merchants, public.products, public.carts, public.cart_items,
  public.checkout_sessions, public.merchant_orders, public.order_items
from anon, authenticated;

grant select, insert, update, delete on table
  public.guest_sessions, public.boards, public.board_images, public.vibe_profiles,
  public.merchants, public.products, public.carts, public.cart_items,
  public.checkout_sessions, public.merchant_orders, public.order_items
to service_role;
