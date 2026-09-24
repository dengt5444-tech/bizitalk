// gakuto_materials is shared with Bijirisu (a general listening app), so it
// also contains general travel/daily-life material that doesn't fit
// BizTalk's business-English-only positioning. Rather than touch Bijirisu's
// own data, BizTalk filters these out of its own listing and detail pages.
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

// Which SceneIllustration to show for each material, so the list and
// detail pages give a visual sense of the situation before listening.
// Anything not listed here falls back to "report" in the UI.
export const MATERIAL_SCENES: Record<string, import("./scenes").SceneKey> = {
  "introducing-yourself-to-a-new-coworker": "casual",
  "scheduling-a-quick-call": "desk-call",
  "asking-a-coworker-for-help": "casual",
  "welcoming-a-visitor": "networking",
  "giving-a-simple-status-update": "meeting",
  "confirming-an-email": "desk-call",
  "job-interview": "interview",
  "business-meeting": "meeting",
  "salary-negotiation": "negotiation",
  "performance-review": "interview",
  "project-delay-escalation": "report",
  "client-complaint-handling": "support",
  "sales-pitch": "presentation",
  "investor-update-call": "desk-call",
  "cross-team-conflict": "meeting",
  "contract-negotiation": "negotiation",
  "resignation-conversation": "interview",
  "budget-planning-meeting": "meeting",
  "crisis-communication": "support",
  "onboarding-new-hire": "meeting",
  "merger-announcement": "presentation",
  "vendor-negotiation": "negotiation",
  "remote-team-standup": "desk-call",
  "giving-constructive-feedback": "interview",
  "networking-event": "networking",
  "handling-layoffs-conversation": "interview",
  "product-launch-strategy": "presentation",
  "executive-summary-briefing": "presentation",
  "quarterly-earnings-call-narration": "report",
  "market-trend-analysis": "report",
  "ceo-keynote-address": "presentation",
  "economic-outlook-briefing": "report",
  "leadership-podcast-monologue": "report",
  "company-strategy-address": "presentation",
  "industry-trend-report": "report",
  "product-roadmap-presentation": "presentation",
  "sustainability-report-briefing": "report",
  "annual-shareholder-address": "presentation",
};
