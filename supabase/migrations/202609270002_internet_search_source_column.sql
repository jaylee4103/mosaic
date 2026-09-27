-- Add source tracking to products table.
-- 'local' = seeded demo products, 'internet' = from web search cache, 'api' = from external feed
alter table public.products
  add column source text default 'local';

-- Allow service_role to set source on upsert
grant update (source) on table public.products to service_role;
