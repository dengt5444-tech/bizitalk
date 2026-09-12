import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/entitlements";
import { listReferralCodeSummaries } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  const summaries = await listReferralCodeSummaries();

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        紹介コード一覧
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        新しいコードは <code className="rounded bg-paper-dim px-1.5 py-0.5 text-sm">
          node scripts/create-referral-code.mjs &lt;CODE&gt; &quot;&lt;label&gt;&quot;
        </code>{" "}
        で発行してください。
      </p>

      {summaries.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">まだ紹介コードがありません。</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-dim text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">コード</th>
                <th className="px-4 py-3 font-medium">ラベル</th>
                <th className="px-4 py-3 font-medium">登録数</th>
                <th className="px-4 py-3 font-medium">うち有効化済み</th>
                <th className="px-4 py-3 font-medium">作成日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {summaries.map((s) => (
                <tr key={s.code}>
                  <td className="px-4 py-3 font-mono font-semibold text-ink">
                    {s.code}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{s.label}</td>
                  <td className="px-4 py-3 text-ink">{s.totalRedeemed}</td>
                  <td className="px-4 py-3 text-ink">{s.rewarded}</td>
                  <td className="px-4 py-3 text-ink-faint">
                    {new Date(s.createdAt).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
