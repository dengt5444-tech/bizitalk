import { restList, restOne } from "@/lib/supabase";
import type { ConversationFeedback, ConversationTurn } from "@/lib/conversation";

export type HistorySession = {
  id: string;
  turnCount: number;
  endedAt: string | null;
  scenarioTitle: string;
  personaName: string;
  personaRole: string;
  fluencyScore: number | null;
};

type ScenarioRef = { title: string; persona_name: string; persona_role: string } | null;

function firstScenario(value: ScenarioRef | ScenarioRef[]): ScenarioRef {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type SessionListRow = {
  id: string;
  turn_count: number;
  feedback: ConversationFeedback | null;
  ended_at: string | null;
  conversation_scenarios: ScenarioRef | ScenarioRef[];
};

export async function listCompletedSessions(): Promise<HistorySession[]> {
  const data = await restList<SessionListRow>(
    "conversation_sessions",
    "id,turn_count,feedback,ended_at,conversation_scenarios(title,persona_name,persona_role)",
    "status=eq.completed&order=ended_at.desc",
  );

  return data.map((s) => {
    const scenario = firstScenario(s.conversation_scenarios as ScenarioRef | ScenarioRef[]);
    return {
      id: s.id,
      turnCount: s.turn_count,
      endedAt: s.ended_at,
      scenarioTitle: scenario?.title ?? "削除されたシーン",
      personaName: scenario?.persona_name ?? "?",
      personaRole: scenario?.persona_role ?? "",
      fluencyScore: s.feedback ? (s.feedback as ConversationFeedback).fluencyScore : null,
    };
  });
}

export type SessionDetail = {
  id: string;
  turnCount: number;
  endedAt: string | null;
  transcript: ConversationTurn[];
  feedback: ConversationFeedback | null;
  scenarioTitle: string;
  personaName: string;
  personaRole: string;
};

type SessionDetailRow = {
  id: string;
  transcript: ConversationTurn[] | null;
  feedback: ConversationFeedback | null;
  turn_count: number;
  ended_at: string | null;
  conversation_scenarios: ScenarioRef | ScenarioRef[];
};

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const data = await restOne<SessionDetailRow>(
    "conversation_sessions",
    "id,transcript,feedback,turn_count,ended_at,conversation_scenarios(title,persona_name,persona_role)",
    `id=eq.${encodeURIComponent(id)}`,
  );
  if (!data || !data.feedback) return null;

  const scenario = firstScenario(data.conversation_scenarios as ScenarioRef | ScenarioRef[]);

  return {
    id: data.id,
    turnCount: data.turn_count,
    endedAt: data.ended_at,
    transcript: (data.transcript ?? []) as ConversationTurn[],
    feedback: data.feedback as ConversationFeedback,
    scenarioTitle: scenario?.title ?? "削除されたシーン",
    personaName: scenario?.persona_name ?? "?",
    personaRole: scenario?.persona_role ?? "",
  };
}
