import Link from "next/link";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversationPlan, getCurrentUser } from "@/lib/entitlements";
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
      "id, slug, title, description, category, level, persona_name, persona_role, persona_background, opening_line, is_free, briefing_en, briefing_ja, estimated_minutes",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!scenario) {
    notFound();
  }

  const user = await getCurrentUser();
  // Conversation practice always needs an account (each session is saved
  // per-user, and usage is tracked per-user for the minutes cap), but
  // every scenario is open to any signed-in user — a plan only changes how
  // many minutes they get (FREE_TRIAL_MINUTES once, ever, with no plan).
  const unlocked = !!user;
  const conversationPlan = user ? await getConversationPlan(user) : null;
  const isFreeTier = !!user && conversationPlan === null;

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
        {scenario.estimated_minutes && (
          <span className="inline-flex items-center gap-1 rounded-full bg-paper-dim px-3 py-1 text-xs font-medium text-ink-faint">
            <Clock size={12} strokeWidth={2} />
            目安 {scenario.estimated_minutes}分
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

      {(scenario.briefing_en || scenario.briefing_ja) && (
        <div className="mt-6 rounded-3xl bg-signal-tint p-6 shadow-card">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-signal-dim uppercase">
            <BookOpen size={15} strokeWidth={2} />
            始める前に読んでおきましょう
          </p>
          {scenario.briefing_en && (
            <p className="mt-3 text-sm leading-relaxed text-ink">{scenario.briefing_en}</p>
          )}
          {scenario.briefing_ja && (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{scenario.briefing_ja}</p>
          )}
        </div>
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
            isFreeTier={isFreeTier}
          />
        ) : (
          <div className="rounded-3xl bg-paper-dim p-8 text-center shadow-card">
            <p className="font-display font-semibold text-ink">
              ログインが必要です
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              ログインすれば、初回10分間の無料体験でこのシーンもお試しいただけます。
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
