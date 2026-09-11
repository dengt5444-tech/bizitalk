"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveWordButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/review/words/${id}`, { method: "DELETE" });
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
