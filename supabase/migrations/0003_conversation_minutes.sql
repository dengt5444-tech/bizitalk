-- Track conversation duration server-side so monthly usage can be capped by
-- minutes of talk time instead of by session count. realtime_started_at is
-- set the first time a session's realtime voice connection is issued a
-- token; duration_seconds is computed and stored when the session ends.
alter table public.conversation_sessions
  add column if not exists realtime_started_at timestamptz,
  add column if not exists duration_seconds integer not null default 0;
