import Link from "next/link";
import { getCurrentUser } from "@/lib/entitlements";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-signal to-violet font-display text-sm text-paper shadow-card transition duration-300 group-hover:scale-110 group-hover:rotate-6">
            ビ
          </span>
          <span className="font-display text-lg font-semibold tracking-wide text-ink">
            ビジトーク
          </span>
        </Link>
        {/* No links are ever hidden past this breakpoint — they wrap onto
            their own row on a narrow viewport instead, since a phone
            browser visiting the web site directly needs the same nav
            reach as desktop (previously vocabulary/dashboard/review were
            sm:-only and unreachable below 640px). */}
        <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/conversation"
            className="rounded-full px-3 py-2 text-ink-soft transition duration-200 hover:bg-signal-tint hover:text-signal-dim"
          >
            会話練習
          </Link>
          <Link
            href="/materials"
            className="rounded-full px-3 py-2 text-ink-soft transition duration-200 hover:bg-signal-tint hover:text-signal-dim"
          >
            リスニング
          </Link>
          <Link
            href="/vocabulary"
            className="rounded-full px-3 py-2 text-ink-soft transition duration-200 hover:bg-signal-tint hover:text-signal-dim"
          >
            単語帳
          </Link>
          {user && (
            <>
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-2 text-ink-soft transition duration-200 hover:bg-signal-tint hover:text-signal-dim"
              >
                マイページ
              </Link>
              <Link
                href="/review"
                className="rounded-full px-3 py-2 text-ink-soft transition duration-200 hover:bg-signal-tint hover:text-signal-dim"
              >
                復習
              </Link>
            </>
          )}
          <Link
            href="/pricing"
            className="rounded-full px-3 py-2 text-ink-soft transition duration-200 hover:bg-signal-tint hover:text-signal-dim"
          >
            料金
          </Link>
          {user ? (
            <form action="/auth/signout" method="post" className="ml-1">
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-1.5 font-medium text-ink transition duration-200 hover:border-ink-faint hover:bg-paper-dim"
              >
                ログアウト
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-full bg-signal px-4 py-1.5 font-medium text-paper shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-signal-dim hover:shadow-card-hover"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
