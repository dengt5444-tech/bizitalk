import type { ConversationFeedback, ConversationTurn } from "./conversation";
import { supabase } from "./supabase";
import { unwrap } from "./useAsync";

// The same Supabase queries the web app's Server Components run, issued
// here with the signed-in user's own session so row-level security scopes
// user data exactly as it does on the site.

export type ScenarioListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string | null;
  level: string | null;
  persona_name: string;
  persona_role: string;
  is_free: boolean;
  order_index: number;
  estimated_minutes: number | null;
};

export async function fetchScenarios() {
  return unwrap(
    await supabase
      .from("conversation_scenarios")
      .select(
        "id, slug, title, description, category, level, persona_name, persona_role, is_free, order_index, estimated_minutes",
      )
      .order("order_index", { ascending: true }),
  ) as ScenarioListItem[];
}

export type ScenarioDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string | null;
  level: string | null;
  persona_name: string;
  persona_role: string;
  persona_background: string | null;
  opening_line: string;
  is_free: boolean;
  briefing_en: string | null;
  briefing_ja: string | null;
  estimated_minutes: number | null;
};

export async function fetchScenario(slug: string) {
  return unwrap(
    await supabase
      .from("conversation_scenarios")
      .select(
        "id, slug, title, description, category, level, persona_name, persona_role, persona_background, opening_line, is_free, briefing_en, briefing_ja, estimated_minutes",
      )
      .eq("slug", slug)
      .maybeSingle(),
  ) as ScenarioDetail | null;
}

type ScenarioRef = { title: string; persona_name: string; persona_role?: string };

export type SessionSummary = {
  id: string;
  status: string;
  turn_count: number;
  feedback: ConversationFeedback | null;
  created_at: string;
  ended_at: string | null;
  conversation_scenarios: ScenarioRef | ScenarioRef[] | null;
};

export async function fetchCompletedSessions() {
  return unwrap(
    await supabase
      .from("conversation_sessions")
      .select(
        "id, status, turn_count, feedback, created_at, ended_at, conversation_scenarios(title, persona_name, persona_role)",
      )
      .eq("status", "completed")
      .order("ended_at", { ascending: false }),
  ) as SessionSummary[];
}

export type SessionDetail = {
  id: string;
  transcript: ConversationTurn[] | null;
  feedback: ConversationFeedback | null;
  turn_count: number;
  ended_at: string | null;
  conversation_scenarios: ScenarioRef | ScenarioRef[] | null;
};

export async function fetchSession(id: string, userId: string) {
  return unwrap(
    await supabase
      .from("conversation_sessions")
      .select(
        "id, transcript, feedback, turn_count, ended_at, conversation_scenarios(title, persona_name, persona_role)",
      )
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
  ) as SessionDetail | null;
}

export type DashboardData = {
  sessions: SessionSummary[];
  vocabCount: number;
  scenarios: { slug: string; title: string; persona_name: string; persona_role: string; description: string }[];
};

export async function fetchDashboard(): Promise<DashboardData> {
  const [sessions, vocab, scenarios] = await Promise.all([
    supabase
      .from("conversation_sessions")
      .select("id, status, turn_count, feedback, created_at, ended_at, conversation_scenarios(title, persona_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("saved_words").select("*", { count: "exact", head: true }),
    supabase
      .from("conversation_scenarios")
      .select("slug, title, persona_name, persona_role, description, order_index")
      .order("order_index", { ascending: true }),
  ]);
  if (vocab.error) throw new Error(vocab.error.message);
  return {
    sessions: unwrap(sessions) as SessionSummary[],
    vocabCount: vocab.count ?? 0,
    scenarios: unwrap(scenarios) as DashboardData["scenarios"],
  };
}

export type MaterialListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  level: string | null;
};

export async function fetchMaterials() {
  return unwrap(
    await supabase
      .from("gakuto_materials")
      .select("id, slug, title, description, order_index, level")
      .order("order_index", { ascending: true }),
  ) as MaterialListItem[];
}

export type MaterialDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  script: string;
  vocab: unknown;
  quiz: unknown;
  dialogue: unknown;
  level: string | null;
};

export async function fetchMaterial(slug: string) {
  return unwrap(
    await supabase
      .from("gakuto_materials")
      .select("id, slug, title, description, script, vocab, quiz, dialogue, level")
      .eq("slug", slug)
      .maybeSingle(),
  ) as MaterialDetail | null;
}

export type DeckListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  items: unknown;
};

export async function fetchDecks() {
  return unwrap(
    await supabase
      .from("vocab_decks")
      .select("id, slug, title, description, order_index, items")
      .order("order_index", { ascending: true }),
  ) as DeckListItem[];
}

export async function fetchDeck(slug: string) {
  return unwrap(
    await supabase.from("vocab_decks").select("id, slug, title, description, items").eq("slug", slug).maybeSingle(),
  ) as Omit<DeckListItem, "order_index"> | null;
}

export type ReviewWord = {
  id: string;
  word: string;
  meaning: string;
  source: "conversation" | "listening";
  groupTitle: string;
};

export async function fetchReviewWords(): Promise<ReviewWord[]> {
  const [conversationWords, listeningWords] = await Promise.all([
    supabase.from("saved_words").select("id, word, meaning, source_title, created_at").order("created_at", { ascending: false }),
    supabase
      .from("gakuto_saved_words")
      .select("id, word, meaning, material_title, created_at")
      .order("created_at", { ascending: false }),
  ]);
  const conversation = unwrap(conversationWords) as { id: string; word: string; meaning: string; source_title: string }[];
  const listening = unwrap(listeningWords) as { id: string; word: string; meaning: string; material_title: string }[];
  return [
    ...conversation.map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      source: "conversation" as const,
      groupTitle: w.source_title || "AI会話",
    })),
    ...listening.map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      source: "listening" as const,
      groupTitle: w.material_title || "リスニング教材",
    })),
  ];
}
