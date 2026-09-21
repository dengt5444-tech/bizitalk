import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isListeningEntitled } from "@/lib/entitlements";
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
  const [{ data: materials }, user] = await Promise.all([
    supabase
      .from("gakuto_materials")
      .select("id, slug, title, description, is_free, order_index, level")
      .order("order_index", { ascending: true }),
    getCurrentUser(),
  ]);

  const subscribed = await isListeningEntitled(user);

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
        無料お試しの教材から、超上級のビジネス英語まで。ログインの上、リスニングプランへの登録でレベルを問わず全教材が聞き放題になります。
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
                  const unlocked = material.is_free || subscribed;
                  const scene = MATERIAL_SCENES[material.slug] ?? "report";
                  return (
                    <li key={material.id}>
                      <Link
                        href={`/materials/${material.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-card-hover"
                      >
                        <div className="relative h-32 w-full overflow-hidden">
                          <SceneIllustration
                            scene={scene}
                            className="transition duration-300 group-hover:scale-105"
                          />
                          {material.is_free ? (
                            <span className="absolute top-3 right-3 rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold text-amber-dim">
                              無料
                            </span>
                          ) : !unlocked ? (
                            <span className="absolute top-3 right-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium text-ink-faint">
                              ロック中
                            </span>
                          ) : null}
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
                            {unlocked ? "再生する" : "詳細を見る"}
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
