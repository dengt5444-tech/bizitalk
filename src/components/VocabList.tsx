"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VocabItem } from "@/lib/materials";

export function VocabList({
  materialId,
  materialTitle,
  vocab,
  isLoggedIn,
}: {
  materialId: string;
  materialTitle: string;
  vocab: VocabItem[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  if (vocab.length === 0) {
    return null;
  }

  async function handleSave(item: VocabItem) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    await fetch("/api/review/listening-words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId,
        materialTitle,
        word: item.word,
        meaning: item.meaning,
      }),
    });

    setSavedWords((prev) => new Set(prev).add(item.word));
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        重要単語・難しい単語
      </h2>
      <ul className="mt-4 space-y-2">
        {vocab.map((item) => {
          const isSaved = savedWords.has(item.word);
          return (
            <li
              key={item.word}
              className="flex items-center justify-between gap-3 rounded-xl bg-paper-dim px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">{item.word}</p>
                <p className="text-sm text-ink-soft">{item.meaning}</p>
              </div>
              <button
                type="button"
                onClick={() => handleSave(item)}
                disabled={isSaved}
                className="shrink-0 rounded-full border border-signal-dim/30 px-3 py-1.5 text-xs font-semibold text-signal-dim transition hover:bg-signal-tint disabled:cursor-default disabled:border-amber/30 disabled:text-amber-dim"
              >
                {isSaved ? "保存済み" : "+ 復習に追加"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
