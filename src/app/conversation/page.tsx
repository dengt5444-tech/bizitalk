import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isEntitled } from "@/lib/entitlements";
import { Avatar } from "@/components/Avatar";
import { CategoryIllustration } from "@/components/illustrations/CategoryIllustration";
import { SceneIllustration } from "@/components/illustrations/SceneIllustration";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  LEVEL_LABELS,
  SCENARIO_SCENES,
  type ScenarioCategory,
  type ScenarioLevel,
} from "@/lib/scenarios";
import { FREE_TALK_SLUG } from "@/lib/conversation";

export const dynamic = "force-dynamic";

export default async function ConversationPage() {
  const supabase = await createClient();
  const [{ data: scenarios }, user] = await Promise.all([
    supabase
      .from("conversation_scenarios")
      .select(
        "id, slug, title, description, category, level, persona_name, persona_role, is_free, order_index",
      )
      .order("order_index", { ascending: true }),
    getCurrentUser(),
  ]);

  const subscribed = await isEntitled(user);
  // Conversation practice always needs an account, so login is required
  // even for the free scenario.
  const loggedInAndEntitled = (isFree: boolean) => !!user && (isFree || subscribed);

  const freeTalk = (scenarios ?? []).find((s) => s.slug === FREE_TALK_SLUG) ?? null;

  const groups = new Map<ScenarioCategory, NonNullable<typeof scenarios>>();
  for (const category of CATEGORY_ORDER) {
    groups.set(category, []);
  }
  for (const scenario of scenarios ?? []) {
    if (scenario.slug === FREE_TALK_SLUG) continue;
    const category = (scenario.category as ScenarioCategory) ?? "teammates";
    const list = groups.get(category) ?? [];
    list.push(scenario);
    groups.set(category, list);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Conversation
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        AI会話練習
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        誰と、どんな場面で話すかで英語は変わります。CEOへの報告、海外の同僚との日々のやり取り、取引先との交渉——相手役ごとにキャラクター設定されたAIとリアルタイム音声で練習し、会話が終わるとAIコーチがフィードバックしてくれます。
      </p>

      {freeTalk && (
        <Link
          href={`/conversation/${freeTalk.slug}`}
          className="group mt-10 flex flex-col gap-5 overflow-hidden rounded-2xl border border-signal/30 bg-signal-tint p-6 transition hover:border-signal sm:flex-row sm:items-center"
        >
          <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
            <SceneIllustration
              scene={SCENARIO_SCENES[freeTalk.slug] ?? "casual"}
              className="transition duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Avatar name={freeTalk.persona_name} size="sm" />
              <p className="font-display font-semibold text-ink group-hover:text-signal">
                {freeTalk.title}
              </p>
              {!loggedInAndEntitled(freeTalk.is_free) && (
                <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium text-ink-faint">
                  ロック中
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {freeTalk.description}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium text-signal sm:self-center">
            {loggedInAndEntitled(freeTalk.is_free) ? "話してみる →" : "詳細を見る →"}
          </p>
        </Link>
      )}

      <div className="mt-12 space-y-14">
        {CATEGORY_ORDER.map((category) => {
          const items = groups.get(category) ?? [];
          if (items.length === 0) return null;

          return (
            <section key={category}>
              <div className="mb-4 flex items-center gap-4 border-b border-line pb-4">
                <CategoryIllustration category={category} size={48} className="shrink-0" />
                <div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-xl font-semibold text-ink">
                      {CATEGORY_LABELS[category]}
                    </h2>
                    <span className="text-sm text-ink-faint">{items.length}シーン</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {CATEGORY_DESCRIPTIONS[category]}
                  </p>
                </div>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((scenario) => {
                  const unlocked = loggedInAndEntitled(scenario.is_free);
                  const scene = SCENARIO_SCENES[scenario.slug] ?? "meeting";
                  return (
                    <li key={scenario.id}>
                      <Link
                        href={`/conversation/${scenario.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-ink-faint"
                      >
                        <div className="relative h-32 w-full overflow-hidden">
                          <SceneIllustration
                            scene={scene}
                            className="transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                            <span className="rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-medium text-ink-faint">
                              {LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]}
                            </span>
                            {scenario.is_free ? (
                              <span className="rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold text-amber-dim">
                                無料
                              </span>
                            ) : !unlocked ? (
                              <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium text-ink-faint">
                                ロック中
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <div className="flex items-center gap-2">
                              <Avatar name={scenario.persona_name} size="sm" />
                              <p className="font-display font-semibold text-ink group-hover:text-signal">
                                {scenario.title}
                              </p>
                            </div>
                            <p className="mt-2 text-xs font-medium text-signal">
                              話し相手: {scenario.persona_name}（{scenario.persona_role}）
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                              {scenario.description}
                            </p>
                          </div>
                          <p className="mt-4 text-sm font-medium text-signal">
                            {unlocked ? "話してみる →" : "詳細を見る →"}
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
