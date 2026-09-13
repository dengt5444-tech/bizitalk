-- Early-access waitlist: collects emails from a public landing page
-- (shared via YouTube community post, etc.) for the "5-person lottery
-- beta test" + "priority launch notice" offer. Written only via the
-- service-role client from /api/waitlist, so RLS is enabled with no
-- policies (no anon/user-session access needed at all).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
