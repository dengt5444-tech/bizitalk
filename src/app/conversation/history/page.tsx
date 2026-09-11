import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/entitlements";
import { Avatar } from "@/components/Avatar";
import type { ConversationFeedback } from "@/lib/conversation";

export const dynamic = "force-dynamic";

export default async function ConversationHistoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/conversation/history");
  }

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("conversation_sessions")
    .select(
      "id, status, turn_count, feedback, created_at, ended_at, conversation_scenarios(title, persona_name, persona_role)",
    )
    .eq("status", "completed")
    .order("ended_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-signal"
      >
        ← マイページに戻る
      </Link>

      <p className="mt-5 text-xs font-medium tracking-[0.2em] text-signal uppercase">
        History
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
        会話の記録
      </h1>
      <p className="mt-3 text-ink-soft">
        これまでの会話とAIコーチのフィードバックをいつでも見返せます。
      </p>

      {!sessions || sessions.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-paper-dim p-10 text-center">
          <p className="font-medium text-ink">まだ会話の記録がありません</p>
          <p className="mt-2 text-sm text-ink-soft">
            シーンを選んでAIと話してみましょう。
          </p>
          <Link
            href="/conversation"
            className="mt-5 inline-block rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-signal-dim"
          >
            シーン一覧へ
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {sessions.map((s) => {
            const scenario = Array.isArray(s.conversation_scenarios)
              ? s.conversation_scenarios[0]
              : s.conversation_scenarios;
            const feedback = s.feedback as ConversationFeedback | null;
            return (
              <li key={s.id}>
                <Link
                  href={`/conversation/history/${s.id}`}
                  className="flex items-center justify-between gap-4 py-5 transition hover:bg-paper-dim"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={scenario?.persona_name ?? "?"} />
                    <div>
                      <p className="font-display font-semibold text-ink">
                        {scenario?.title ?? "削除されたシーン"}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {s.ended_at
                          ? new Date(s.ended_at).toLocaleString("ja-JP", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : ""}
                        {" ・ "}
                        {s.turn_count}ターン
                      </p>
                    </div>
                  </div>
                  {feedback && (
                    <span className="shrink-0 font-display text-lg font-semibold text-signal">
                      {feedback.fluencyScore}
                      <span className="text-xs font-normal text-ink-faint">/5</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
