import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  EXCLUDED_MATERIAL_SLUGS,
  LEVEL_LABELS,
  LEVEL_ORDER,
  MATERIAL_SCENES,
  type MaterialLevel,
} from "@/lib/materials";
import { SceneIllustration } from "@/components/illustrations/SceneIllustration";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: materials } = await supabase
    .from("gakuto_materials")
    .select("id, slug, title, description, order_index, level")
    .order("order_index", { ascending: true });

  const groups = new Map<
    MaterialLevel,
    NonNullable<typeof materials>
  >();
  for (const level of LEVEL_ORDER) {
    groups.set(level, []);
  }
  for (const material of materials ?? []) {
    if (EXCLUDED_MATERIAL_SLUGS.has(material.slug)) continue;
    const level = (material.level as MaterialLevel) ?? "beginner";
    const list = groups.get(level) ?? [];
    list.push(material);
    groups.set(level, list);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Listening
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        リスニング教材一覧
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        初級から超上級のビジネス英語まで、全教材いつでも無料で聞き放題です。
      </p>

      <div className="mt-12 space-y-14">
        {LEVEL_ORDER.map((level) => {
          const items = groups.get(level) ?? [];
          if (items.length === 0) return null;

          return (
            <section key={level}>
              <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {LEVEL_LABELS[level]}
                </h2>
                <span className="text-sm text-ink-faint">{items.length}本</span>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((material) => {
                  const scene = MATERIAL_SCENES[material.slug] ?? "report";
                  return (
                    <li key={material.id}>
                      <Link
                        href={`/materials/${material.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-elevated"
                      >
                        <div className="relative h-32 w-full overflow-hidden">
                          <SceneIllustration
                            scene={scene}
                            className="transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <p className="font-display font-semibold text-ink group-hover:text-signal">
                              {material.title}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                              {material.description}
                            </p>
                          </div>
                          <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-signal">
                            再生する
                            <ArrowRight size={16} strokeWidth={2} />
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
