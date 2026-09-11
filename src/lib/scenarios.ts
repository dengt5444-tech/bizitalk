export type ScenarioLevel = "beginner" | "intermediate" | "advanced";

export const LEVEL_LABELS: Record<ScenarioLevel, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export const LEVEL_ORDER: ScenarioLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export type ScenarioCategory =
  | "leadership"
  | "international"
  | "clients"
  | "teammates";

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  leadership: "経営陣・上司",
  international: "海外の同僚",
  clients: "顧客・取引先",
  teammates: "同僚・日常",
};

export const CATEGORY_DESCRIPTIONS: Record<ScenarioCategory, string> = {
  leadership: "CEOや上司など、社内の意思決定者と話す力を鍛えます。",
  international: "インド・シンガポール・イギリスなど、世界各地の同僚との働き方の違いに慣れます。",
  clients: "交渉・クレーム対応など、社外の相手との一筋縄ではいかないやり取りを練習します。",
  teammates: "雑談から日々のチームワークまで、身近な英語コミュニケーションを鍛えます。",
};

export const CATEGORY_ORDER: ScenarioCategory[] = [
  "teammates",
  "international",
  "clients",
  "leadership",
];
