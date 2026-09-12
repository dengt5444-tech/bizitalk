"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveWordButton({
  id,
  source = "conversation",
}: {
  id: string;
  source?: "conversation" | "listening";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const endpoint =
      source === "listening"
        ? `/api/review/listening-words/${id}`
        : `/api/review/words/${id}`;
    await fetch(endpoint, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-rose hover:text-rose disabled:opacity-50"
    >
      削除
    </button>
  );
}
