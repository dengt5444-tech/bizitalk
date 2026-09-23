import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/Avatar";
import { SITE_NAME } from "@/lib/site";
import type { ConversationFeedback } from "@/lib/conversation";

export const dynamic = "force-dynamic";

// Public, unauthenticated — the session id itself (an unguessable UUID) is
// the capability. Only a small, deliberately non-sensitive slice of the
// session is ever selected or rendered here: the score summary and good
// expressions, never the transcript, corrections, or vocab suggestions,
// since those were written for the learner alone and can be more candid
// about mistakes than something meant to be posted publicly.
async function getShareableSession(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("conversation_sessions")
    .select(
      "status, feedback, conversation_scenarios(title, persona_name, persona_role)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data || data.status !== "completed" || !data.feedback) return null;

  const scenario = Array.isArray(data.conversation_scenarios)
    ? data.conversation_scenarios[0]
    : data.conversation_scenarios;

  return { feedback: data.feedback as ConversationFeedback, scenario };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getShareableSession(id);
  if (!data) return { title: SITE_NAME };

  const title = `フルエンシー評価 ${data.feedback.fluencyScore}/5 — ${SITE_NAME}`;
  const description = data.scenario
    ? `「${data.scenario.title}」でAI英会話を練習しました。`
    : "AI英会話を練習しました。";

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getShareableSession(id);
  if (!data) notFound();

  const { feedback, scenario } = data;

  return (
    <main className="mx-auto max-w-lg px-6 py-14 sm:py-20">
      <div className="rounded-3xl bg-surface p-6 text-center shadow-elevated sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
          {SITE_NAME}
        </p>
        {scenario && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <Avatar name={scenario.persona_name} size="lg" />
            <p className="font-display font-semibold text-ink">{scenario.title}</p>
            <p className="text-xs text-ink-soft">
              話し相手: {scenario.persona_name}（{scenario.persona_role}）
            </p>
          </div>
        )}

        <p className="mt-6 text-xs font-medium tracking-[0.15em] text-ink-faint uppercase">
          フルエンシー評価
        </p>
        <p className="mt-1 font-display text-5xl font-semibold text-ink">
          {feedback.fluencyScore}
          <span className="text-xl text-ink-faint"> / 5</span>
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {(
            [
              ["文法", feedback.categoryScores?.grammar],
              ["語彙", feedback.categoryScores?.vocabulary],
              ["丁寧さ", feedback.categoryScores?.professionalism],
            ] as const
          ).map(([label, score]) => (
            <div key={label} className="rounded-xl bg-paper-dim px-2 py-3">
              <p className="text-xs text-ink-faint">{label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">
                {score ?? "-"}
                <span className="text-xs font-normal text-ink-faint">/5</span>
              </p>
            </div>
          ))}
        </div>

        {feedback.goodExpressions.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-ink-soft">よく使えていた表現</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {feedback.goodExpressions.map((phrase, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-tint px-3 py-1 text-xs font-medium text-amber-dim"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-ink-soft">
          AIとのリアルタイム音声で、ビジネス英会話を練習できます。
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-signal px-6 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim"
        >
          無料で試してみる
        </Link>
      </div>
    </main>
  );
}
