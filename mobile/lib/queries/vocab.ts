import { supabase } from "@/lib/supabase";
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
  const { data, error } = await supabase
    .from("vocab_decks")
    .select("id, slug, title, description, is_free, order_index, items")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((d) => ({ ...d, items: d.items ?? [] })) as VocabDeckSummary[];
}

export async function getVocabDeckBySlug(slug: string): Promise<VocabDeckSummary | null> {
  const { data, error } = await supabase
    .from("vocab_decks")
    .select("id, slug, title, description, is_free, order_index, items")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, items: data.items ?? [] } as VocabDeckSummary;
}
