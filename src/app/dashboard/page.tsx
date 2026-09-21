import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/entitlements";
import { Avatar } from "@/components/Avatar";
import { DangerZone } from "@/components/DangerZone";
import type { ConversationFeedback } from "@/lib/conversation";

export const dynamic = "force-dynamic";

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function computeStreak(dateKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dateKeys.has(dateKey(cursor.toISOString()))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (dateKeys.has(dateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const supabase = await createClient();
  const [{ data: sessions }, { count: vocabCount }, { data: scenarios }] =
    await Promise.all([
      supabase
        .from("conversation_sessions")
        .select(
          "id, status, turn_count, feedback, created_at, ended_at, conversation_scenarios(title, persona_name)",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("saved_words")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("conversation_scenarios")
        .select("slug, title, persona_name, persona_role, description, order_index")
        .order("order_index", { ascending: true }),
    ]);

  const completed = (sessions ?? []).filter((s) => s.status === "completed");

  const practicedDays = new Set(
    completed.filter((s) => s.ended_at).map((s) => dateKey(s.ended_at!)),
  );
  const streak = computeStreak(practicedDays);

  const weekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = completed.filter(
    (s) => s.ended_at && new Date(s.ended_at).getTime() >= weekAgo,
  ).length;

  const scoredSessions = completed
    .filter((s) => s.feedback)
    .map((s) => ({
      id: s.id,
      endedAt: s.ended_at as string,
      scenario: Array.isArray(s.conversation_scenarios)
        ? s.conversation_scenarios[0]
        : s.conversation_scenarios,
      feedback: s.feedback as ConversationFeedback,
    }))
    .reverse();

  const avgFluency =
    scoredSessions.length > 0
      ? Math.round(
          (scoredSessions.reduce((sum, s) => sum + s.feedback.fluencyScore, 0) /
            scoredSessions.length) *
            10,
        ) / 10
      : null;

  const trend = scoredSessions.slice(-8);
  const recent = completed.slice(0, 5);

  const practicedTitles = new Set(
    (sessions ?? [])
      .map((s) =>
        Array.isArray(s.conversation_scenarios)
          ? s.conversation_scenarios[0]
          : s.conversation_scenarios,
      )
      .filter(Boolean)
      .map((s) => s!.title),
  );
  const recommended =
    (scenarios ?? []).find((sc) => !practicedTitles.has(sc.title)) ??
    (scenarios ?? [])[0];

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Dashboard
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        おかえりなさい
      </h1>
      <p className="mt-3 text-ink-soft">
        ここまでの練習の記録です。少しずつでも、話すたびに力がついています。
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="継続日数" value={`${streak}`} unit="日" />
        <StatTile label="今週の会話" value={`${thisWeekCount}`} unit="回" />
        <StatTile
          label="平均フルエンシー"
          value={avgFluency !== null ? `${avgFluency}` : "-"}
          unit="/5"
        />
        <StatTile label="保存した単語" value={`${vocabCount ?? 0}`} unit="語" />
      </div>

      {trend.length >= 2 && (
        <section className="mt-12 rounded-3xl bg-surface p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-ink">
            フルエンシースコアの推移
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            直近{trend.length}回の会話フィードバックより
          </p>
          <div className="mt-6 flex items-end gap-3 sm:gap-4">
            {trend.map((s) => (
              <div key={s.id} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-display text-sm font-semibold text-ink">
                  {s.feedback.fluencyScore}
                </span>
                <div className="flex h-24 w-full items-end rounded bg-paper-dim">
                  <div
                    className="w-full rounded-t bg-signal"
                    style={{ height: `${(s.feedback.fluencyScore / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-ink-faint">
                  {new Date(s.endedAt).toLocaleDateString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-[1fr_1.4fr]">
        {recommended && (
          <section className="rounded-3xl bg-ink p-6 shadow-elevated">
            <p className="text-xs font-medium tracking-[0.15em] text-paper/70 uppercase">
              次におすすめ
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={recommended.persona_name} />
              <div>
                <p className="font-display font-semibold text-paper">
                  {recommended.title}
                </p>
                <p className="text-xs text-paper/70">
                  {recommended.persona_name}（{recommended.persona_role}）
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-paper/80">
              {recommended.description}
            </p>
            <Link
              href={`/conversation/${recommended.slug}`}
              className="group mt-5 inline-flex items-center gap-1.5 rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-paper transition duration-300 hover:-translate-y-0.5 hover:bg-signal-dim hover:shadow-card"
            >
              このシーンを話す
              <ArrowRight size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </section>
        )}

        <section className="rounded-3xl bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              最近の会話
            </h2>
            <Link
              href="/conversation/history"
              className="inline-flex items-center gap-1 text-sm font-medium text-signal transition hover:text-signal-dim"
            >
              すべて見る
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">
              まだ会話の記録がありません。無料のシーンから話してみましょう。
            </p>
          ) : (
            <ul className="mt-4 space-y-1">
              {recent.map((s) => {
                const scenario = Array.isArray(s.conversation_scenarios)
                  ? s.conversation_scenarios[0]
                  : s.conversation_scenarios;
                const feedback = s.feedback as ConversationFeedback | null;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/conversation/history/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-paper-dim"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={scenario?.persona_name ?? "?"} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {scenario?.title ?? "削除されたシーン"}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {s.ended_at
                              ? new Date(s.ended_at).toLocaleDateString("ja-JP")
                              : ""}
                          </p>
                        </div>
                      </div>
                      {feedback && (
                        <span className="font-display text-sm font-semibold text-signal">
                          {feedback.fluencyScore}/5
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-12">
        <DangerZone />
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">
        {value}
        <span className="ml-1 text-sm font-normal text-ink-faint">{unit}</span>
      </p>
    </div>
  );
}
