export type MaterialLevel = "beginner" | "intermediate" | "advanced";

export const LEVEL_LABELS: Record<MaterialLevel, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export const LEVEL_ORDER: MaterialLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

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
