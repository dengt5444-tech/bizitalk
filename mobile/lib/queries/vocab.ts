import { restList, restOne } from "@/lib/supabase";
import type { VocabWord } from "@/lib/vocab";

export type VocabDeckSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_free: boolean;
  order_index: number;
  items: VocabWord[];
};

export async function listVocabDecks(): Promise<VocabDeckSummary[]> {
  const data = await restList<VocabDeckSummary>(
    "vocab_decks",
    "id,slug,title,description,is_free,order_index,items",
    "order=order_index.asc",
  );
  return data.map((d) => ({ ...d, items: d.items ?? [] }));
}

export async function getVocabDeckBySlug(slug: string): Promise<VocabDeckSummary | null> {
  const data = await restOne<VocabDeckSummary>(
    "vocab_decks",
    "id,slug,title,description,is_free,order_index,items",
    `slug=eq.${encodeURIComponent(slug)}`,
  );
  if (!data) return null;
  return { ...data, items: data.items ?? [] };
}
