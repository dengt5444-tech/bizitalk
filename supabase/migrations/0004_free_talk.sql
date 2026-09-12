-- Free-talk mode lets the learner specify (or skip) a topic per session
-- instead of always stepping into a fixed scenario persona.
alter table public.conversation_sessions
  add column if not exists custom_topic text;
