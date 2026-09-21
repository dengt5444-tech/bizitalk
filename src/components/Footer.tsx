import Link from "next/link";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-dim">
      <div className="mx-auto max-w-5xl px-6 py-12 text-sm text-ink-soft">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {SITE_NAME}
            </p>
            <p className="mt-1.5 max-w-xs leading-relaxed">
              CEO・海外の同僚・取引先——シチュエーション別に練習するAIビジネス英会話
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 sm:flex sm:flex-wrap">
            <Link href="/conversation" className="transition hover:text-ink">
              会話練習
            </Link>
            <Link href="/materials" className="transition hover:text-ink">
              リスニング
            </Link>
            <Link href="/vocabulary" className="transition hover:text-ink">
              単語帳
            </Link>
            <Link href="/review" className="transition hover:text-ink">
              復習
            </Link>
            <Link href="/pricing" className="transition hover:text-ink">
              料金プラン
            </Link>
            <Link href="/terms" className="transition hover:text-ink">
              利用規約
            </Link>
            <Link href="/privacy" className="transition hover:text-ink">
              プライバシーポリシー
            </Link>
            <Link href="/legal" className="transition hover:text-ink">
              特定商取引法に基づく表記
            </Link>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            お問い合わせ:{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="ink-link font-medium text-ink underline hover:text-signal"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>&copy; {new Date().getFullYear()} {SITE_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
