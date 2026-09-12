import Link from "next/link";
import { getCurrentUser } from "@/lib/entitlements";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal font-display text-sm text-paper">
            ビ
          </span>
          <span className="font-display text-lg font-semibold tracking-wide text-ink">
            ビジトーク
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/conversation"
            className="rounded-full px-3 py-2 text-ink-soft transition hover:text-ink"
          >
            会話練習
          </Link>
          <Link
            href="/materials"
            className="rounded-full px-3 py-2 text-ink-soft transition hover:text-ink"
          >
            リスニング
          </Link>
          <Link
            href="/vocabulary"
            className="hidden rounded-full px-3 py-2 text-ink-soft transition hover:text-ink sm:inline-block"
          >
            単語帳
          </Link>
          {user && (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-full px-3 py-2 text-ink-soft transition hover:text-ink sm:inline-block"
              >
                マイページ
              </Link>
              <Link
                href="/review"
                className="hidden rounded-full px-3 py-2 text-ink-soft transition hover:text-ink sm:inline-block"
              >
                復習
              </Link>
            </>
          )}
          <Link
            href="/pricing"
            className="rounded-full px-3 py-2 text-ink-soft transition hover:text-ink"
          >
            料金
          </Link>
          {user ? (
            <form action="/auth/signout" method="post" className="ml-1">
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-1.5 font-medium text-ink transition hover:border-ink-faint"
              >
                ログアウト
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-full bg-signal px-4 py-1.5 font-medium text-paper transition hover:bg-signal-dim"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
