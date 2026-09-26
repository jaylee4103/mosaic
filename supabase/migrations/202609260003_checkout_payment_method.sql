-- Preserve the verified payment method for each merchant order.
-- A Stripe payment can be paid with a card even when Link is offered, so
-- checkout responses must not infer Link usage from payment_status alone.
alter table public.merchant_orders
  add column payment_method_type text,
  add column link_verified boolean not null default false;
