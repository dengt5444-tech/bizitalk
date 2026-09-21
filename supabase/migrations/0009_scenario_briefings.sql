-- Bilingual pre-reading briefing shown on the scenario detail page before
-- starting a conversation, so the learner isn't dropped straight into a
-- cold open with no context (especially important for advanced scenarios,
-- which open in medias res on purpose). Nullable: most beginner/intermediate
-- scenarios are self-explanatory from the existing description/persona
-- background alone and don't need one.
alter table public.conversation_scenarios
  add column if not exists briefing_en text,
  add column if not exists briefing_ja text;
