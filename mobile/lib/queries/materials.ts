import { supabase } from "@/lib/supabase";
import { EXCLUDED_MATERIAL_SLUGS, type MaterialDetail, type MaterialSummary } from "@/lib/materials";

export async function listMaterials(): Promise<MaterialSummary[]> {
  const { data, error } = await supabase
    .from("gakuto_materials")
    .select("id, slug, title, description, is_free, order_index, level")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []).filter((m) => !EXCLUDED_MATERIAL_SLUGS.has(m.slug)) as MaterialSummary[];
}

export async function getMaterialBySlug(slug: string): Promise<MaterialDetail | null> {
  if (EXCLUDED_MATERIAL_SLUGS.has(slug)) return null;

  const { data, error } = await supabase
    .from("gakuto_materials")
    .select("id, slug, title, description, script, is_free, vocab, quiz, dialogue, level, order_index")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    vocab: data.vocab ?? [],
    quiz: data.quiz ?? [],
    dialogue: data.dialogue ?? [],
  } as MaterialDetail;
}
