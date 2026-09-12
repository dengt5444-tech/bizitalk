"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = "listening" | "trial" | "standard" | "unlimited";

const PLAN_LABEL: Record<Plan, string> = {
  listening: "¥490で始める",
  trial: "¥980で始める",
  standard: "¥4,990で始める",
  unlimited: "¥9,900で始める",
};

export function CheckoutButton({
  isLoggedIn,
  plan = "standard",
}: {
  isLoggedIn: boolean;
  plan?: Plan;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/login?next=/pricing");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();

    if (!res.ok || !body.url) {
      setError(body.error ?? "決済ページの作成に失敗しました。");
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
        className="w-full rounded-full bg-signal px-6 py-3.5 text-base font-medium text-paper transition hover:bg-signal-dim disabled:opacity-50"
      >
        {loading ? "処理中..." : PLAN_LABEL[plan]}
      </button>
      {error && <p className="mt-3 text-sm text-rose">{error}</p>}
    </div>
  );
}
