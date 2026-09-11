import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/entitlements";
import { Avatar } from "@/components/Avatar";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import type { ConversationFeedback, ConversationTurn } from "@/lib/conversation";

export const dynamic = "force-dynamic";

export default async function ConversationHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/conversation/history/${id}`);
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("conversation_sessions")
    .select(
      "id, transcript, feedback, turn_count, ended_at, conversation_scenarios(title, persona_name, persona_role)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session || !session.feedback) {
    notFound();
  }

  const scenario = Array.isArray(session.conversation_scenarios)
    ? session.conversation_scenarios[0]
    : session.conversation_scenarios;
  const transcript = (session.transcript ?? []) as ConversationTurn[];
  const feedback = session.feedback as ConversationFeedback;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <Link
        href="/conversation/history"
        className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-signal"
      >
        ← 会話の記録に戻る
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <Avatar name={scenario?.persona_name ?? "?"} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {scenario?.title ?? "削除されたシーン"}
          </h1>
          <p className="text-sm font-medium text-signal">
            {scenario &&
              `話し相手: ${scenario.persona_name}（${scenario.persona_role}）`}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-faint">
        {session.ended_at &&
          new Date(session.ended_at).toLocaleString("ja-JP", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        {` ・ ${session.turn_count}ターン`}
      </p>

      <details className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <summary className="cursor-pointer font-display font-semibold text-ink">
          会話の全文を見る
        </summary>
        <div className="mt-4 space-y-3">
          {transcript.map((turn, index) => (
            <div
              key={index}
              className={`flex items-end gap-2 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {turn.role === "assistant" && (
                <Avatar name={scenario?.persona_name ?? "?"} size="sm" />
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  turn.role === "user"
                    ? "bg-signal text-paper"
                    : "bg-paper-dim text-ink"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <FeedbackPanel feedback={feedback} scenarioTitle={scenario?.title ?? ""} />
      </div>
    </main>
  );
}
