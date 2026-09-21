import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isListeningEntitled } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const [{ data: decks }, user] = await Promise.all([
    supabase
      .from("vocab_decks")
      .select("id, slug, title, description, is_free, order_index, items")
      .order("order_index", { ascending: true }),
    getCurrentUser(),
  ]);

  const subscribed = await isListeningEntitled(user);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Vocabulary
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        単語帳
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        外資系企業でよく使われるビジネス英単語や、ワーキングホリデーの職場で役立つ実務英語をテーマ別に学べます。フラッシュカードと4択テストで、覚えたかどうかその場で確認できます。
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {(decks ?? []).map((deck) => {
          const unlocked = deck.is_free || subscribed;
          const wordCount = Array.isArray(deck.items) ? deck.items.length : 0;
          return (
            <li key={deck.id}>
              <Link
                href={`/vocabulary/${deck.slug}`}
                className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-card-hover"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink-faint">
                      {wordCount}語
                    </span>
                    {deck.is_free ? (
                      <span className="rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold text-amber-dim">
                        無料
                      </span>
                    ) : !unlocked ? (
                      <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink-faint">
                        ロック中
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 font-display font-semibold text-ink group-hover:text-signal">
                    {deck.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {deck.description}
                  </p>
                </div>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-signal">
                  {unlocked ? "学習する" : "詳細を見る"}
                  <ArrowRight size={16} strokeWidth={2} />
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
