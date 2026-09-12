import type { ScenarioCategory, ScenarioLevel } from "@/lib/scenarios";

export type ConversationScenario = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ScenarioCategory;
  level: ScenarioLevel;
  persona_name: string;
  persona_role: string;
  voice: string;
  system_prompt: string;
  opening_line: string;
  is_free: boolean;
};

export type ConversationTurn = {
  role: "assistant" | "user";
  text: string;
};

export type ConversationCorrection = {
  original: string;
  corrected: string;
  explanation: string;
};

export type ConversationVocabSuggestion = {
  word: string;
  meaning: string;
  example: string;
};

export type ConversationCategoryScores = {
  grammar: number;
  vocabulary: number;
  professionalism: number;
};

export type ConversationFeedback = {
  overallComment: string;
  fluencyScore: number;
  categoryScores: ConversationCategoryScores;
  goodExpressions: string[];
  corrections: ConversationCorrection[];
  vocabSuggestions: ConversationVocabSuggestion[];
};

export const MAX_TURNS_PER_SESSION = 16;

// The one scenario where the learner picks (or skips) their own topic
// instead of stepping into a fixed persona/situation.
export const FREE_TALK_SLUG = "free-talk";
export const CUSTOM_TOPIC_MAX_LENGTH = 200;

export function freeTalkOpeningLine(
  customTopic: string | null | undefined,
  fallback: string,
): string {
  const topic = customTopic?.trim();
  if (!topic) return fallback;
  return `Hi there! I heard you'd like to talk about ${topic} today — I'd love to dive into that. What's on your mind about it?`;
}

export function withCustomTopic(
  systemPrompt: string,
  customTopic: string | null | undefined,
): string {
  const topic = customTopic?.trim();
  if (!topic) return systemPrompt;
  return `${systemPrompt}\n\nFor this specific session, the learner has said they'd like to talk about: "${topic}". Focus the conversation on this topic in a natural, engaged way, while still following the guidance above.`;
}
