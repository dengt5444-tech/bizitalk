import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

const LINKS = [
  {
    href: "/admin/usage",
    title: "AI会話の利用状況",
    description: "今月のリアルタイム音声の利用時間とプラン別の推定コスト。",
  },
  {
    href: "/admin/referrals",
    title: "紹介コード",
    description: "発行済みの紹介コードごとの登録数・有効化数。",
  },
  {
    href: "/admin/waitlist",
    title: "先行モニター応募リスト",
    description: "/early-access から登録されたメールアドレスの一覧。",
  },
];

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        管理者ページ
      </h1>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-ink-faint"
            >
              <p className="font-display font-semibold text-ink group-hover:text-signal">
                {link.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {link.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
