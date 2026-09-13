import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { data: entries } = await admin
    .from("waitlist")
    .select("email, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        先行モニター応募リスト
      </h1>
      <p className="mt-3 text-ink-soft">
        `/early-access` から登録された方の一覧です。合計{entries?.length ?? 0}件。
      </p>

      {!entries || entries.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">まだ応募がありません。</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-dim text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">メールアドレス</th>
                <th className="px-4 py-3 font-medium">登録日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry) => (
                <tr key={entry.email}>
                  <td className="px-4 py-3 text-ink">{entry.email}</td>
                  <td className="px-4 py-3 text-ink-faint">
                    {new Date(entry.created_at).toLocaleString("ja-JP")}
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
