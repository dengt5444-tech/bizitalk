"use client";

import { useMemo, useState } from "react";
import type { VocabWord } from "@/lib/vocab";

type Mode = "list" | "flashcards" | "quiz";

function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function VocabDeckPractice({
  deckTitle,
  words,
  isLoggedIn,
}: {
  deckTitle: string;
  words: VocabWord[];
  isLoggedIn: boolean;
}) {
  const [mode, setMode] = useState<Mode>("list");

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {(["list", "flashcards", "quiz"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? "bg-signal text-paper"
                : "border border-line text-ink-soft hover:border-ink-faint"
            }`}
          >
            {m === "list" ? "単語一覧" : m === "flashcards" ? "フラッシュカード" : "テストで確認する"}
          </button>
        ))}
      </div>

      {mode === "list" && (
        <ul className="mt-6 space-y-3">
          {words.map((w) => (
            <li key={w.word} className="rounded-xl border border-line bg-surface p-4">
              <p className="font-display font-semibold text-ink">{w.word}</p>
              <p className="mt-1 text-sm text-ink-soft">{w.meaning}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-faint italic">
                {w.example}
              </p>
            </li>
          ))}
        </ul>
      )}

      {mode === "flashcards" && <FlashcardDeck words={words} />}

      {mode === "quiz" && (
        <VocabQuiz words={words} deckTitle={deckTitle} isLoggedIn={isLoggedIn} />
      )}
    </div>
  );
}

function FlashcardDeck({ words }: { words: VocabWord[] }) {
  const [deck] = useState(() => shuffled(words));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  const card = deck[index];
  const done = index >= deck.length;

  function next(knew: boolean) {
    if (knew) setKnownCount((c) => c + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-3xl bg-surface p-8 text-center shadow-card">
        <p className="font-display text-lg font-semibold text-ink">
          {deck.length}語、お疲れさまでした!
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          「覚えていた」と答えたのは {knownCount} / {deck.length} 語でした。
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-6 rounded-full bg-signal px-6 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim"
        >
          もう一度シャッフルして復習する
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-center text-xs text-ink-faint">
        {index + 1} / {deck.length}
      </p>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="mt-3 flex min-h-[12rem] w-full flex-col items-center justify-center rounded-3xl bg-surface p-8 text-center shadow-card transition duration-300 hover:shadow-card-hover"
      >
        {flipped ? (
          <>
            <p className="text-xs font-medium tracking-[0.15em] text-ink-faint uppercase">意味</p>
            <p className="mt-3 font-display text-xl font-semibold text-ink">{card.meaning}</p>
            <p className="mt-3 text-sm text-ink-faint italic">{card.example}</p>
          </>
        ) : (
          <p className="font-display text-2xl font-semibold text-ink">{card.word}</p>
        )}
        <p className="mt-4 text-xs text-ink-faint">タップして{flipped ? "単語" : "意味"}を見る</p>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => next(false)}
          className="rounded-full border border-line px-4 py-3 text-sm font-medium text-ink transition hover:border-ink-faint"
        >
          もう一度復習したい
        </button>
        <button
          type="button"
          onClick={() => next(true)}
          className="rounded-full bg-signal px-4 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim"
        >
          覚えていた
        </button>
      </div>
    </div>
  );
}

type QuizQuestion = {
  word: VocabWord;
  choices: string[];
  answerIndex: number;
};

function buildQuiz(words: VocabWord[]): QuizQuestion[] {
  return shuffled(words).map((word) => {
    const distractorPool = words.filter((w) => w.word !== word.word).map((w) => w.meaning);
    const distractors = shuffled(distractorPool).slice(0, 3);
    const choices = shuffled([word.meaning, ...distractors]);
    return { word, choices, answerIndex: choices.indexOf(word.meaning) };
  });
}

function VocabQuiz({
  words,
  deckTitle,
  isLoggedIn,
}: {
  words: VocabWord[];
  deckTitle: string;
  isLoggedIn: boolean;
}) {
  const questions = useMemo(() => buildQuiz(words), [words]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  if (questions.length < 2) {
    return (
      <p className="mt-6 text-sm text-ink-soft">
        テストを作るには単語がもう少し必要です。
      </p>
    );
  }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce(
    (total, q, i) => total + (answers[i] === q.answerIndex ? 1 : 0),
    0,
  );

  async function handleSubmit() {
    setSubmitted(true);
    if (!isLoggedIn) return;

    const missed = questions.filter((q, i) => answers[i] !== q.answerIndex);
    await Promise.all(
      missed.map((q) =>
        fetch("/api/review/words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceTitle: deckTitle,
            word: q.word.word,
            meaning: q.word.meaning,
          }),
        }),
      ),
    );
    setSavedCount(missed.length);
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
    setSavedCount(0);
  }

  return (
    <div className="mt-6">
      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.word.word}>
            <p className="font-medium text-ink">
              Q{i + 1}. &ldquo;{q.word.word}&rdquo; の意味は?
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.choices.map((choice, choiceIndex) => {
                const isSelected = answers[i] === choiceIndex;
                const isCorrect = submitted && choiceIndex === q.answerIndex;
                const isWrongSelected = submitted && isSelected && choiceIndex !== q.answerIndex;

                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [i]: choiceIndex }))}
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
                  間違えた単語 {savedCount} 件を復習リストに保存しました。「復習」タブから確認できます。
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
