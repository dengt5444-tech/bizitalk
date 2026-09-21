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

// A high safety ceiling (transcript/DB-size and truly runaway-session
// protection), not a target — actual cost exposure is governed separately
// by the monthly minutes cap. Most learners should never come close to
// this; SUGGESTED_FEEDBACK_TURN below is the number that's actually meant
// to be reached in a normal session.
export const MAX_TURNS_PER_SESSION = 40;

// Once the learner hits this many turns, the UI offers — but never forces
// — wrapping up for feedback. They can keep going as long as they like, or
// end whenever they decide they're done; this is just a friendly nudge at
// a point where there's usually enough material for good feedback.
export const SUGGESTED_FEEDBACK_TURN = 10;

export const FREE_TALK_SLUG = "free-talk";
export const CUSTOM_TOPIC_MAX_LENGTH = 200;
