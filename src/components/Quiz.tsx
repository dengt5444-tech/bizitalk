"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/materials";

export function Quiz({
  materialId,
  materialTitle,
  questions,
  isLoggedIn,
}: {
  materialId: string;
  materialTitle: string;
  questions: QuizQuestion[];
  isLoggedIn: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  if (questions.length === 0) {
    return null;
  }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce(
    (total, q, i) => total + (answers[i] === q.answerIndex ? 1 : 0),
    0,
  );

  async function handleSubmit() {
    setSubmitted(true);

    if (!isLoggedIn) return;

    const missedWords = questions.filter(
      (q, i) => answers[i] !== q.answerIndex && q.word,
    );

    await Promise.all(
      missedWords.map((q) =>
        fetch("/api/review/listening-words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId,
            materialTitle,
            word: q.word,
            meaning: q.wordMeaning ?? "",
          }),
        }),
      ),
    );

    setSavedCount(missedWords.length);
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
    setSavedCount(0);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        理解度テスト
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        音声を聞いてから挑戦してみましょう。全{questions.length}問。
      </p>

      <div className="mt-6 space-y-6">
        {questions.map((q, i) => (
          <div key={i}>
            <p className="font-medium text-ink">
              Q{i + 1}. {q.question}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.choices.map((choice, choiceIndex) => {
                const isSelected = answers[i] === choiceIndex;
                const isCorrect = submitted && choiceIndex === q.answerIndex;
                const isWrongSelected =
                  submitted && isSelected && choiceIndex !== q.answerIndex;

                return (
                  <button
                    key={choiceIndex}
                    type="button"
                    disabled={submitted}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [i]: choiceIndex }))
                    }
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                      isCorrect
                        ? "border-amber bg-amber-tint text-amber-dim"
                        : isWrongSelected
                          ? "border-rose bg-rose-tint text-rose"
                          : isSelected
                            ? "border-signal bg-signal-tint text-signal-dim"
                            : "border-line hover:border-ink-faint"
                    } ${submitted ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="w-full rounded-full bg-signal px-6 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            採点する
          </button>
        ) : (
          <div className="rounded-xl bg-paper-dim p-4">
            <p className="font-display text-base font-semibold text-ink">
              結果: {score} / {questions.length} 問正解
            </p>
            {isLoggedIn ? (
              savedCount > 0 && (
                <p className="mt-1 text-sm text-signal">
                  間違えた単語 {savedCount}
                  件を復習リストに保存しました。「復習」タブから確認できます。
                </p>
              )
            ) : (
              <p className="mt-1 text-sm text-ink-soft">
                ログインすると、間違えた単語を自動で復習リストに保存できます。
              </p>
            )}
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-ink-faint"
            >
              もう一度挑戦する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
