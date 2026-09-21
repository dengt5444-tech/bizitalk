// Ported from ../src/lib/vocab.ts — keep in sync if the web copy changes.

export type VocabWord = {
  word: string;
  meaning: string;
  example: string;
};

export type VocabDeckCategory =
  | "foreign-company"
  | "working-holiday"
  | "meetings"
  | "negotiation"
  | "presentations"
  | "business-email"
  | "finance-accounting"
  | "marketing-sales"
  | "hr-recruiting"
  | "project-management"
  | "leadership-management"
  | "startup-entrepreneurship";

export const VOCAB_CATEGORY_LABELS: Record<VocabDeckCategory, string> = {
  "foreign-company": "外資系ビジネス英単語",
  "working-holiday": "ワーホリ・海外就労で使う実務英語",
  meetings: "会議・ミーティング英語",
  negotiation: "交渉英語",
  presentations: "プレゼンテーション英語",
  "business-email": "ビジネスメール英語",
  "finance-accounting": "財務・会計英語",
  "marketing-sales": "マーケティング・営業英語",
  "hr-recruiting": "人事・採用英語",
  "project-management": "プロジェクトマネジメント英語",
  "leadership-management": "リーダーシップ・マネジメント英語",
  "startup-entrepreneurship": "スタートアップ・起業英語",
};
