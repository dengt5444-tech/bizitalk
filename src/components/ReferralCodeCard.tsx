"use client";

import { useState, useSyncExternalStore } from "react";

// window.location.origin doesn't exist during the server render, so it's
// read through useSyncExternalStore: this renders the server-safe snapshot
// ("") for the initial/SSR pass and switches to the real value once
// mounted, without needing a setState-in-effect to bridge the two.
function noopSubscribe() {
  return () => {};
}
function getOriginSnapshot() {
  return window.location.origin;
}
function getOriginServerSnapshot() {
  return "";
}

export function ReferralCodeCard({
  code,
  totalReferred,
  rewarded,
}: {
  code: string;
  totalReferred: number;
  rewarded: number;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const origin = useSyncExternalStore(
    noopSubscribe,
    getOriginSnapshot,
    getOriginServerSnapshot,
  );
  const shareUrl = origin ? `${origin}/pricing?ref=${code}` : "";

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API unavailable — the value is still visible to select
      // and copy manually.
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        紹介プログラム
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        あなたの紹介コードで登録した方がいれば、こちらで確認できます。
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-lg border border-line bg-paper-dim px-4 py-2.5 font-display text-lg font-semibold tracking-wider text-ink">
          {code}
        </span>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink-faint"
        >
          {copied === "code" ? "コピーしました" : "コードをコピー"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink-soft outline-none"
        />
        <button
          type="button"
          onClick={() => copy(shareUrl, "link")}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-ink-faint"
        >
          {copied === "link" ? "コピーしました" : "リンクをコピー"}
        </button>
      </div>

      <div className="mt-5 flex gap-6 text-sm">
        <p className="text-ink-soft">
          紹介した人数: <span className="font-semibold text-ink">{totalReferred}</span>人
        </p>
        <p className="text-ink-soft">
          うち登録済み: <span className="font-semibold text-ink">{rewarded}</span>人
        </p>
      </div>
    </section>
  );
}
