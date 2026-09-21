// Ported from ../src/lib/conversation.ts — keep in sync if the web copy changes.
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
export const FREE_TALK_SLUG = "free-talk";
export const CUSTOM_TOPIC_MAX_LENGTH = 200;
