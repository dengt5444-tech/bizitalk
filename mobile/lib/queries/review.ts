import { supabase } from "@/lib/supabase";

export type ReviewWord = {
  id: string;
  word: string;
  meaning: string;
  source: "conversation" | "listening";
  groupTitle: string;
};

export async function listReviewWords(): Promise<ReviewWord[]> {
  const [{ data: conversationWords, error: e1 }, { data: listeningWords, error: e2 }] = await Promise.all([
    supabase
      .from("saved_words")
      .select("id, word, meaning, source_title, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("gakuto_saved_words")
      .select("id, word, meaning, material_title, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  return [
    ...(conversationWords ?? []).map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      source: "conversation" as const,
      groupTitle: w.source_title || "AI会話",
    })),
    ...(listeningWords ?? []).map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      source: "listening" as const,
      groupTitle: w.material_title || "リスニング教材",
    })),
  ];
}
