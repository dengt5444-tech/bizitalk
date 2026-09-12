export type VocabWord = {
  word: string;
  meaning: string;
  example: string;
};

export type VocabDeckCategory = "foreign-company" | "working-holiday";

export const VOCAB_CATEGORY_LABELS: Record<VocabDeckCategory, string> = {
  "foreign-company": "外資系ビジネス英単語",
  "working-holiday": "ワーホリ・海外就労で使う実務英語",
};
