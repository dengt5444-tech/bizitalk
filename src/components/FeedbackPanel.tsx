"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ConversationFeedback } from "@/lib/conversation";

export function FeedbackPanel({
  feedback,
  scenarioTitle,
}: {
  feedback: ConversationFeedback;
  scenarioTitle: string;
}) {
  const [savedVocab, setSavedVocab] = useState<Set<string>>(new Set());

  async function handleSaveVocab(word: string, meaning: string) {
    setSavedVocab((prev) => new Set(prev).add(word));
    await fetch("/api/review/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceTitle: scenarioTitle,
        word,
        meaning,
      }),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
          フルエンシー評価
        </p>
        <p className="mt-2 font-display text-3xl text-ink">
          {feedback.fluencyScore}
          <span className="text-lg text-ink-faint"> / 5</span>
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {(
            [
              ["文法", feedback.categoryScores?.grammar],
              ["語彙", feedback.categoryScores?.vocabulary],
              ["丁寧さ", feedback.categoryScores?.professionalism],
            ] as const
          ).map(([label, score]) => (
            <div key={label} className="rounded-xl bg-paper-dim px-2 py-3">
              <p className="text-xs text-ink-faint">{label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">
                {score ?? "-"}
                <span className="text-xs font-normal text-ink-faint">/5</span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          {feedback.overallComment}
        </p>
      </div>

      {feedback.goodExpressions.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">
            よく使えていた表現
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {feedback.goodExpressions.map((phrase, i) => (
              <span
                key={i}
                className="rounded-full bg-amber-tint px-3 py-1 text-xs font-medium text-amber-dim"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
      )}

      {feedback.corrections.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">
            直すとよい表現
          </h3>
          <ul className="mt-2 space-y-3">
            {feedback.corrections.map((c, i) => (
              <li key={i} className="rounded-xl bg-paper-dim p-3.5 text-sm">
                <p className="text-rose line-through">{c.original}</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium text-signal-dim">
                  <ArrowRight size={14} strokeWidth={2} className="shrink-0" />
                  {c.corrected}
                </p>
                <p className="mt-1 text-xs text-ink-soft">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.vocabSuggestions.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">
            使えると良い単語・表現
          </h3>
          <ul className="mt-2 space-y-2">
            {feedback.vocabSuggestions.map((v, i) => {
              const isSaved = savedVocab.has(v.word);
              return (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-xl bg-paper-dim px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-ink">{v.word}</p>
                    <p className="text-sm text-ink-soft">{v.meaning}</p>
                    <p className="mt-1 text-xs italic text-ink-faint">{v.example}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveVocab(v.word, v.meaning)}
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
      )}
    </div>
  );
}
