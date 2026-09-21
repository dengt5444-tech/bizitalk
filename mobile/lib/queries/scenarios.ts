import { supabase } from "@/lib/supabase";
import type { ScenarioCategory, ScenarioLevel } from "@/lib/scenarios";

export type ScenarioSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ScenarioCategory;
  level: ScenarioLevel;
  persona_name: string;
  persona_role: string;
  is_free: boolean;
  order_index: number;
  estimated_minutes: number | null;
};

export type ScenarioDetail = ScenarioSummary & {
  persona_background: string | null;
  opening_line: string;
  briefing_en: string | null;
  briefing_ja: string | null;
};

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const { data, error } = await supabase
    .from("conversation_scenarios")
    .select(
      "id, slug, title, description, category, level, persona_name, persona_role, is_free, order_index, estimated_minutes",
    )
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScenarioSummary[];
}

export async function getScenarioBySlug(slug: string): Promise<ScenarioDetail | null> {
  const { data, error } = await supabase
    .from("conversation_scenarios")
    .select(
      "id, slug, title, description, category, level, persona_name, persona_role, persona_background, opening_line, is_free, order_index, estimated_minutes, briefing_en, briefing_ja",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as ScenarioDetail | null;
}
