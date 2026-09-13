-- Lets `subscriptions` (this app's own AI-conversation entitlement table)
-- and the shared `gakuto_subscriptions` (listening plan, owned by the
-- sibling Bijirisu project but written to by BizTalk's own checkout/webhook
-- code already) record an entitlement that came from Apple's StoreKit
-- in-app purchases, not just Stripe. Each user still has exactly one row
-- (the existing `unique (user_id)` constraint is unchanged) — buying
-- through either store just changes what that one row says.

alter table public.subscriptions
  add column if not exists source text not null default 'stripe',
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_product_id text;

alter table public.gakuto_subscriptions
  add column if not exists source text not null default 'stripe',
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_product_id text;

-- An Apple subscription (identified by its original_transaction_id, which
-- is stable across renewals) should never end up attached to more than one
-- user's row. Partial index since Stripe-sourced rows leave this null.
create unique index if not exists subscriptions_apple_original_transaction_id_idx
  on public.subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

create unique index if not exists gakuto_subscriptions_apple_original_transaction_id_idx
  on public.gakuto_subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
