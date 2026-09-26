-- Persist the two-store demo between Next.js route handler invocations.
create table public.demo_checkout_sessions (
  guest_session_id uuid primary key references public.guest_sessions(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  version bigint not null default 0 check (version >= 0),
  updated_at timestamptz not null default now()
);

alter table public.demo_checkout_sessions enable row level security;
revoke all on table public.demo_checkout_sessions from anon, authenticated;
grant select, insert, update, delete on table public.demo_checkout_sessions to service_role;
