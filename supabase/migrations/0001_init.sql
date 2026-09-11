-- ビジトーク: AI conversation-practice service. Clean schema for a fresh
-- project (no legacy listening-materials tables).

create table if not exists public.conversation_scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  category text not null default 'teammates',
  level text not null default 'beginner',
  persona_name text not null,
  persona_role text not null default '',
  persona_background text not null default '',
  voice text not null default 'alloy',
  realtime_voice text not null default 'alloy',
  system_prompt text not null,
  opening_line text not null,
  order_index integer not null default 0,
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.conversation_scenarios enable row level security;

drop policy if exists "conversation scenarios are publicly readable" on public.conversation_scenarios;
create policy "conversation scenarios are publicly readable"
  on public.conversation_scenarios for select
  using (true);

create index if not exists conversation_scenarios_order_idx
  on public.conversation_scenarios (order_index);
create index if not exists conversation_scenarios_category_idx
  on public.conversation_scenarios (category);
create index if not exists conversation_scenarios_level_idx
  on public.conversation_scenarios (level);

-- One row per practice session. `transcript` holds the full turn-by-turn
-- exchange (assistant + user), doubling as both the chat log and the
-- source text for on-demand TTS playback of past turns in text mode.
create table if not exists public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.conversation_scenarios(id) on delete cascade,
  voice text not null default 'alloy',
  transcript jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  turn_count integer not null default 0,
  feedback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.conversation_sessions enable row level security;

drop policy if exists "users can read their own conversation sessions" on public.conversation_sessions;
create policy "users can read their own conversation sessions"
  on public.conversation_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own conversation sessions" on public.conversation_sessions;
create policy "users can insert their own conversation sessions"
  on public.conversation_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own conversation sessions" on public.conversation_sessions;
create policy "users can update their own conversation sessions"
  on public.conversation_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists conversation_sessions_user_id_idx
  on public.conversation_sessions (user_id);

-- Words/expressions a user saved from a session's AI feedback, for later
-- review.
create table if not exists public.saved_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_title text not null default '',
  word text not null,
  meaning text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

alter table public.saved_words enable row level security;

drop policy if exists "users can read their own saved words" on public.saved_words;
create policy "users can read their own saved words"
  on public.saved_words for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own saved words" on public.saved_words;
create policy "users can insert their own saved words"
  on public.saved_words for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own saved words" on public.saved_words;
create policy "users can update their own saved words"
  on public.saved_words for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete their own saved words" on public.saved_words;
create policy "users can delete their own saved words"
  on public.saved_words for delete
  using (auth.uid() = user_id);

create index if not exists saved_words_user_id_idx
  on public.saved_words (user_id);

-- Subscription / entitlement state, kept in sync by the Stripe webhook.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  status text not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.subscriptions enable row level security;

drop policy if exists "users can read their own subscription" on public.subscriptions;
create policy "users can read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only server-side code (service role, which bypasses RLS) writes to this
-- table, so no insert/update/delete policies are granted to end users.

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

-- This project's public schema doesn't grant default privileges to
-- service_role/anon/authenticated, so state them explicitly here.
grant select on public.conversation_scenarios to anon, authenticated, service_role;
grant insert, update, delete on public.conversation_scenarios to service_role;

grant select, insert, update on public.conversation_sessions to authenticated, service_role;
grant delete on public.conversation_sessions to service_role;

grant select, insert, update, delete on public.saved_words to authenticated, service_role;

grant select on public.subscriptions to authenticated, service_role;
grant insert, update, delete on public.subscriptions to service_role;
