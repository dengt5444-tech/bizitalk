-- Replace the earlier self-service, per-user referral schema (removed —
-- unused, and only ever had one harmless test row) with an admin-issued
-- model: a small number of codes tied to an external influencer/partner
-- label, not to any user's own account. Codes are created by the admin
-- via scripts/create-referral-code.mjs, entered by a new subscriber at
-- checkout, and recorded here once their subscription first becomes
-- active.
drop table if exists public.referrals;
drop table if exists public.referral_codes;

create table public.referral_codes (
  code text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.referral_codes(code) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  -- "pending" until the subscription is first active, then "rewarded"
  -- permanently (a later cancellation doesn't claw back an already-earned
  -- referral payout).
  status text not null default 'pending',
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;
alter table public.referral_redemptions enable row level security;
-- Intentionally no policies: these tables have no per-user ownership
-- concept (a code belongs to an external influencer, not an app account),
-- so they're only ever read/written server-side via the service-role
-- client (checkout, the Stripe webhook, and the admin-only
-- /admin/referrals page) — never through a signed-in user's own session.

create index if not exists referral_redemptions_code_idx
  on public.referral_redemptions (code);
