import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONVERSATION_MINUTES_PER_MONTH, FREE_MINUTES_PER_MONTH } from "@/lib/limits";

export const dynamic = "force-dynamic";

// Same planning figure documented in src/lib/limits.ts — not a measured
// value yet. Comparing "estimated cost at this figure" against actual
// OpenAI billing for the same period is exactly how that figure should be
// validated once there's enough real traffic.
const ESTIMATED_YEN_PER_MINUTE = 16;

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

type PlanKey = "trial" | "standard" | "unlimited" | "free";

function planForPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_TRIAL) return "trial";
  if (priceId === process.env.STRIPE_PRICE_ID_UNLIMITED) return "unlimited";
  if (priceId === process.env.STRIPE_PRICE_ID) return "standard";
  return null;
}

const PLAN_LABEL: Record<PlanKey, string> = {
  trial: "お試し",
  standard: "スタンダード",
  unlimited: "使い放題",
  free: "無料(未登録)",
};

const PLAN_ORDER: PlanKey[] = ["free", "trial", "standard", "unlimited"];

export default async function AdminUsagePage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  const admin = createAdminClient();

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [{ data: sessions }, { data: subscriptions }] = await Promise.all([
    admin
      .from("conversation_sessions")
      .select("user_id, duration_seconds")
      .gte("created_at", startOfMonth.toISOString()),
    admin.from("subscriptions").select("user_id, price_id, status"),
  ]);

  const planByUserId = new Map<string, PlanKey>();
  for (const sub of subscriptions ?? []) {
    if (!ACTIVE_STATUSES.has(sub.status)) continue;
    const plan = planForPriceId(sub.price_id);
    if (plan) planByUserId.set(sub.user_id, plan);
  }

  const secondsByPlan = new Map<PlanKey, number>();
  for (const key of PLAN_ORDER) secondsByPlan.set(key, 0);

  let totalSeconds = 0;
  for (const session of sessions ?? []) {
    const plan = planByUserId.get(session.user_id) ?? "free";
    const seconds = session.duration_seconds ?? 0;
    secondsByPlan.set(plan, (secondsByPlan.get(plan) ?? 0) + seconds);
    totalSeconds += seconds;
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  const estimatedCost = totalMinutes * ESTIMATED_YEN_PER_MINUTE;

  const capMinutesFor = (plan: PlanKey): number =>
    plan === "free" ? FREE_MINUTES_PER_MONTH : CONVERSATION_MINUTES_PER_MONTH[plan];

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        今月のAI会話利用状況
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        {startOfMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
        分。realtime音声のみ集計(フィードバック生成・TTSのコストは含みません)。
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs text-ink-faint">今月の合計利用時間</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            {totalMinutes}
            <span className="ml-1 text-sm font-normal text-ink-faint">分</span>
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs text-ink-faint">
            推定コスト(¥{ESTIMATED_YEN_PER_MINUTE}/分の見積もりで計算・未検証)
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            ¥{estimatedCost.toLocaleString("ja-JP")}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-dim text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">プラン</th>
              <th className="px-4 py-3 font-medium">利用時間(分)</th>
              <th className="px-4 py-3 font-medium">上限(分/月)</th>
              <th className="px-4 py-3 font-medium">推定コスト</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PLAN_ORDER.map((plan) => {
              const minutes = Math.round((secondsByPlan.get(plan) ?? 0) / 60);
              return (
                <tr key={plan}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {PLAN_LABEL[plan]}
                  </td>
                  <td className="px-4 py-3 text-ink">{minutes}</td>
                  <td className="px-4 py-3 text-ink-faint">{capMinutesFor(plan)}</td>
                  <td className="px-4 py-3 text-ink-faint">
                    ¥{(minutes * ESTIMATED_YEN_PER_MINUTE).toLocaleString("ja-JP")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-ink-faint">
        ¥{ESTIMATED_YEN_PER_MINUTE}/分は `src/lib/limits.ts`
        に書かれている見積もり値です。OpenAIの実際の請求額と、この推定コストを月次で見比べることで、見積もりが正しいか検証できます(実測値が大きくずれる場合は上限分数の見直しが必要です)。
      </p>
    </main>
  );
}
