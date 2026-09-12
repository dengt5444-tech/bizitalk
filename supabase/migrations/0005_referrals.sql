-- Each user's own referral code (generated lazily on first use), and a
-- record of who referred whom once a referred user's subscription becomes
-- active. Payout of the referral bonus itself stays a manual process for
-- now — this only tracks issuance and outcome.
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

drop policy if exists "users can read their own referral code" on public.referral_codes;
create policy "users can read their own referral code"
  on public.referral_codes for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own referral code" on public.referral_codes;
create policy "users can insert their own referral code"
  on public.referral_codes for insert
  with check (auth.uid() = user_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  -- "pending" until the referred user's subscription is first active,
  -- then "rewarded" permanently (a later cancellation doesn't claw back
  -- an already-earned referral bonus).
  status text not null default 'pending',
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.referrals enable row level security;

drop policy if exists "users can read referrals they made" on public.referrals;
create policy "users can read referrals they made"
  on public.referrals for select
  using (auth.uid() = referrer_user_id);

create index if not exists referrals_referrer_user_id_idx
  on public.referrals (referrer_user_id);
