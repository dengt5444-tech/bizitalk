"use client";

import { useState } from "react";

export function ManageSubscriptionButton({
  plan = "conversation",
}: {
  plan?: "conversation" | "listening";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();

    if (!res.ok || !body.url) {
      setError(
        body.error === "no_subscription"
          ? "管理者権限で有効になっています(Stripeでのお支払いはありません)。"
          : "管理画面を開けませんでした。時間をおいて再度お試しください。",
      );
      setLoading(false);
      return;
    }

    window.location.href = body.url;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full border border-signal-dim/30 px-4 py-2 text-sm font-semibold text-signal-dim transition hover:bg-signal-tint disabled:opacity-50"
      >
        {loading ? "処理中..." : "お支払い方法の変更・解約はこちら"}
      </button>
      {error && <p className="mt-2 text-xs text-ink-soft">{error}</p>}
    </div>
  );
}
