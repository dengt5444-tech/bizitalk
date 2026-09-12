-- Vocabulary decks (e.g. "foreign-affiliated company business vocab",
-- "working-holiday workplace English"). Unlike the listening materials,
-- this content is original to BizTalk, so it gets its own table rather
-- than reusing Bijirisu's shared gakuto_* tables.
create table if not exists public.vocab_decks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  category text not null default 'business',
  order_index integer not null default 0,
  is_free boolean not null default false,
  -- Each element: { "word": "...", "meaning": "...", "example": "..." }
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.vocab_decks enable row level security;

drop policy if exists "vocab decks are publicly readable" on public.vocab_decks;
create policy "vocab decks are publicly readable"
  on public.vocab_decks for select
  using (true);

create index if not exists vocab_decks_order_idx on public.vocab_decks (order_index);

-- This project's public schema doesn't grant default privileges to
-- service_role/anon/authenticated, so state them explicitly here.
grant select on public.vocab_decks to anon, authenticated, service_role;
grant insert, update, delete on public.vocab_decks to service_role;
