import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isEntitled } from "@/lib/entitlements";
import { ConversationRoom } from "@/components/ConversationRoom";
import { Avatar } from "@/components/Avatar";
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  SCENARIO_SCENES,
  type ScenarioCategory,
  type ScenarioLevel,
} from "@/lib/scenarios";
import { SceneIllustration } from "@/components/illustrations/SceneIllustration";

export const dynamic = "force-dynamic";

export default async function ConversationScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: scenario } = await supabase
    .from("conversation_scenarios")
    .select(
      "id, slug, title, description, category, level, persona_name, persona_role, persona_background, opening_line, is_free",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!scenario) {
    notFound();
  }

  const user = await getCurrentUser();
  const subscribed = await isEntitled(user);
  // Conversation practice always needs an account (each session is saved
  // per-user), so login is required even for the free scenario.
  const unlocked = !!user && (scenario.is_free || subscribed);

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <Link
        href="/conversation"
        className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-signal"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        シーン一覧に戻る
      </Link>

      <div className="mt-5 overflow-hidden rounded-2xl">
        <SceneIllustration
          scene={SCENARIO_SCENES[scenario.slug] ?? "meeting"}
          size="hero"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-block rounded-full bg-paper-dim px-3 py-1 text-xs font-medium text-ink-faint">
          {CATEGORY_LABELS[(scenario.category as ScenarioCategory) ?? "teammates"]}
        </span>
        <span className="inline-block rounded-full bg-signal-tint px-3 py-1 text-xs font-semibold text-signal-dim">
          {LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]}
        </span>
        {scenario.is_free && (
          <span className="inline-block rounded-full bg-amber-tint px-3 py-1 text-xs font-semibold text-amber-dim">
            無料お試し
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar name={scenario.persona_name} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {scenario.title}
          </h1>
          <p className="text-sm font-medium text-signal">
            話し相手: {scenario.persona_name}（{scenario.persona_role}）
          </p>
        </div>
      </div>
      <p className="mt-3 text-ink-soft">{scenario.description}</p>
      {scenario.persona_background && (
        <p className="mt-2 text-sm text-ink-faint">{scenario.persona_background}</p>
      )}

      <div className="mt-8">
        {unlocked ? (
          <ConversationRoom
            scenario={{
              slug: scenario.slug,
              title: scenario.title,
              personaName: scenario.persona_name,
              personaRole: scenario.persona_role,
              openingLine: scenario.opening_line,
            }}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-paper-dim p-8 text-center">
            <p className="font-display font-semibold text-ink">
              {!user ? "ログインが必要です" : "このシーンはロックされています"}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {!user
                ? scenario.is_free
                  ? "この無料シーンを試すには、ログインが必要です。"
                  : "ログインの上、有料プランへの登録が必要です。"
                : "有料プランへの登録で全シーンが練習できます。"}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {!user && (
                <Link
                  href="/login"
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink-faint"
                >
                  ログイン
                </Link>
              )}
              <Link
                href="/pricing"
                className="rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-signal-dim"
              >
                料金プランを見る
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
