import { supabase } from "@/lib/supabase";
import type { ConversationFeedback } from "@/lib/conversation";

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function computeStreak(dateKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dateKeys.has(dateKey(cursor.toISOString()))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (dateKeys.has(dateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export type RecentSession = {
  id: string;
  endedAt: string | null;
  scenarioTitle: string;
  personaName: string;
  fluencyScore: number | null;
};

export type ScoredSession = {
  id: string;
  endedAt: string;
  fluencyScore: number;
};

export type RecommendedScenario = {
  slug: string;
  title: string;
  persona_name: string;
  persona_role: string;
  description: string;
};

export type DashboardData = {
  streak: number;
  thisWeekCount: number;
  avgFluency: number | null;
  savedWordCount: number;
  trend: ScoredSession[];
  recent: RecentSession[];
  recommended: RecommendedScenario | null;
};

type ScenarioRef = { title: string; persona_name: string; persona_role?: string } | null;

function firstScenario(value: ScenarioRef | ScenarioRef[]): ScenarioRef {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function loadDashboard(): Promise<DashboardData> {
  const [{ data: sessions }, { count: vocabCount }, { data: scenarios }] = await Promise.all([
    supabase
      .from("conversation_sessions")
      .select("id, status, feedback, created_at, ended_at, conversation_scenarios(title, persona_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("saved_words").select("*", { count: "exact", head: true }),
    supabase
      .from("conversation_scenarios")
      .select("slug, title, persona_name, persona_role, description, order_index")
      .order("order_index", { ascending: true }),
  ]);

  const completed = (sessions ?? []).filter((s) => s.status === "completed");

  const practicedDays = new Set(
    completed.filter((s) => s.ended_at).map((s) => dateKey(s.ended_at as string)),
  );
  const streak = computeStreak(practicedDays);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = completed.filter(
    (s) => s.ended_at && new Date(s.ended_at).getTime() >= weekAgo,
  ).length;

  const scoredSessions: ScoredSession[] = completed
    .filter((s) => s.feedback && s.ended_at)
    .map((s) => ({
      id: s.id,
      endedAt: s.ended_at as string,
      fluencyScore: (s.feedback as ConversationFeedback).fluencyScore,
    }))
    .reverse();

  const avgFluency =
    scoredSessions.length > 0
      ? Math.round((scoredSessions.reduce((sum, s) => sum + s.fluencyScore, 0) / scoredSessions.length) * 10) / 10
      : null;

  const trend = scoredSessions.slice(-8);

  const recent: RecentSession[] = completed.slice(0, 5).map((s) => {
    const scenario = firstScenario(s.conversation_scenarios as ScenarioRef | ScenarioRef[]);
    return {
      id: s.id,
      endedAt: s.ended_at,
      scenarioTitle: scenario?.title ?? "削除されたシーン",
      personaName: scenario?.persona_name ?? "?",
      fluencyScore: s.feedback ? (s.feedback as ConversationFeedback).fluencyScore : null,
    };
  });

  const practicedTitles = new Set(
    (sessions ?? [])
      .map((s) => firstScenario(s.conversation_scenarios as ScenarioRef | ScenarioRef[]))
      .filter((s): s is NonNullable<ScenarioRef> => !!s)
      .map((s) => s.title),
  );
  const recommended = (scenarios ?? []).find((sc) => !practicedTitles.has(sc.title)) ?? (scenarios ?? [])[0] ?? null;

  return {
    streak,
    thisWeekCount,
    avgFluency,
    savedWordCount: vocabCount ?? 0,
    trend,
    recent,
    recommended,
  };
}
