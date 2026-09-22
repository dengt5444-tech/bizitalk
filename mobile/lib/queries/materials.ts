import { restList, restOne } from "@/lib/supabase";
import { EXCLUDED_MATERIAL_SLUGS, type MaterialDetail, type MaterialSummary } from "@/lib/materials";

export async function listMaterials(): Promise<MaterialSummary[]> {
  const data = await restList<MaterialSummary>(
    "gakuto_materials",
    "id,slug,title,description,is_free,order_index,level",
    "order=order_index.asc",
  );
  return data.filter((m) => !EXCLUDED_MATERIAL_SLUGS.has(m.slug));
}

export async function getMaterialBySlug(slug: string): Promise<MaterialDetail | null> {
  if (EXCLUDED_MATERIAL_SLUGS.has(slug)) return null;

  const data = await restOne<MaterialDetail>(
    "gakuto_materials",
    "id,slug,title,description,script,is_free,vocab,quiz,dialogue,level,order_index",
    `slug=eq.${encodeURIComponent(slug)}`,
  );
  if (!data) return null;

  return {
    ...data,
    vocab: data.vocab ?? [],
    quiz: data.quiz ?? [],
    dialogue: data.dialogue ?? [],
  };
}
