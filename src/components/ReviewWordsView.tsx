"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RemoveWordButton } from "@/components/RemoveWordButton";

export type ReviewWord = {
  id: string;
  word: string;
  meaning: string;
  source: "conversation" | "listening";
  groupTitle: string;
};

function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function ReviewWordsView({ words }: { words: ReviewWord[] }) {
  const [mode, setMode] = useState<"list" | "flashcards">("list");

  const groups = useMemo(() => {
    const map = new Map<string, ReviewWord[]>();
    for (const w of words) {
      const list = map.get(w.groupTitle) ?? [];
      list.push(w);
      map.set(w.groupTitle, list);
    }
    return Array.from(map.entries());
  }, [words]);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">全{words.length}語</p>
        <button
          type="button"
          onClick={() => setMode(mode === "list" ? "flashcards" : "list")}
          className="inline-flex items-center gap-1.5 rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-signal-dim"
        >
          {mode === "list" ? (
            <>
              フラッシュカードで復習する
              <ArrowRight size={16} strokeWidth={2} />
            </>
          ) : (
            <>
              <ArrowLeft size={16} strokeWidth={2} />
              リスト表示に戻る
            </>
          )}
        </button>
      </div>

      {mode === "flashcards" ? (
        <FlashcardDeck words={words} />
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map(([groupTitle, items]) => (
            <div key={groupTitle}>
              <h2 className="text-xs font-medium tracking-[0.15em] text-ink-faint uppercase">
                {groupTitle}
              </h2>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">{item.word}</p>
                      {item.meaning && (
                        <p className="text-sm text-ink-soft">{item.meaning}</p>
                      )}
                    </div>
                    <RemoveWordButton id={item.id} source={item.source} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlashcardDeck({ words }: { words: ReviewWord[] }) {
  const [deck] = useState(() => shuffled(words));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  const card = deck[index];
  const done = index >= deck.length;

  function next(knew: boolean) {
    setReviewedCount((c) => c + 1);
    if (knew) setKnownCount((c) => c + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setReviewedCount(0);
  }

  if (deck.length === 0) return null;

  if (done) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-lg font-semibold text-ink">
          {deck.length}語、復習お疲れさまでした!
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          「覚えていた」と答えたのは {knownCount} / {reviewedCount} 語でした。
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
        className="mt-3 flex min-h-[12rem] w-full flex-col items-center justify-center rounded-2xl border border-line bg-surface p-8 text-center transition hover:border-ink-faint"
      >
        {flipped ? (
          <>
            <p className="text-xs font-medium tracking-[0.15em] text-ink-faint uppercase">
              意味
            </p>
            <p className="mt-3 font-display text-xl font-semibold text-ink">
              {card.meaning || "(意味の登録がありません)"}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium tracking-[0.15em] text-ink-faint uppercase">
              {card.groupTitle}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">
              {card.word}
            </p>
          </>
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
