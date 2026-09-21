alter table public.conversation_scenarios
  add column if not exists estimated_minutes integer;
