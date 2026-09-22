import { restList } from "@/lib/supabase";

export type ReviewWord = {
  id: string;
  word: string;
  meaning: string;
  source: "conversation" | "listening";
  groupTitle: string;
};

type SavedWordRow = { id: string; word: string; meaning: string; source_title: string | null; created_at: string };
type GakutoSavedWordRow = {
  id: string;
  word: string;
  meaning: string;
  material_title: string | null;
  created_at: string;
};

export async function listReviewWords(): Promise<ReviewWord[]> {
  const [conversationWords, listeningWords] = await Promise.all([
    restList<SavedWordRow>("saved_words", "id,word,meaning,source_title,created_at", "order=created_at.desc"),
    restList<GakutoSavedWordRow>(
      "gakuto_saved_words",
      "id,word,meaning,material_title,created_at",
      "order=created_at.desc",
    ),
  ]);

  return [
    ...conversationWords.map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      source: "conversation" as const,
      groupTitle: w.source_title || "AI会話",
    })),
    ...listeningWords.map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      source: "listening" as const,
      groupTitle: w.material_title || "リスニング教材",
    })),
  ];
}
