// Ported from ../src/lib/materials.ts — keep in sync if the web copy changes.

// gakuto_materials is shared with Bijirisu (a general listening app), so it
// also contains general travel/daily-life material that doesn't fit
// BizTalk's business-English-only positioning. Filtered out here too.
export const EXCLUDED_MATERIAL_SLUGS = new Set([
  "cafe-order",
  "airport-checkin",
  "hotel-checkin",
  "restaurant-reservation",
  "doctor-appointment",
  "shopping-return",
  "asking-directions",
  "small-talk-weather",
]);

export type MaterialLevel = "beginner" | "intermediate" | "advanced";

export const LEVEL_LABELS: Record<MaterialLevel, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export const LEVEL_ORDER: MaterialLevel[] = ["beginner", "intermediate", "advanced"];

export type DialogueLine = {
  speaker: "A" | "B";
  voice: string;
  text: string;
};

export type VocabItem = {
  word: string;
  meaning: string;
};

export type QuizQuestion = {
  question: string;
  choices: string[];
  answerIndex: number;
  word?: string;
  wordMeaning?: string;
};

export type MaterialSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_free: boolean;
  order_index: number;
  level: MaterialLevel;
};

export type MaterialDetail = MaterialSummary & {
  script: string;
  vocab: VocabItem[];
  quiz: QuizQuestion[];
  dialogue: DialogueLine[];
};
