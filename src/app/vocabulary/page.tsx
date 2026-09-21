import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("vocab_decks")
    .select("id, slug, title, description, order_index, items")
    .order("order_index", { ascending: true });

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Vocabulary
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        単語帳
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        外資系企業でよく使われるビジネス英単語や、ワーキングホリデーの職場で役立つ実務英語をテーマ別に学べます。フラッシュカードと4択テストで、覚えたかどうかその場で確認できます。すべて無料でご利用いただけます。
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {(decks ?? []).map((deck) => {
          const wordCount = Array.isArray(deck.items) ? deck.items.length : 0;
          return (
            <li key={deck.id}>
              <Link
                href={`/vocabulary/${deck.slug}`}
                className="group flex h-full flex-col justify-between rounded-3xl bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-elevated"
              >
                <div>
                  <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink-faint">
                    {wordCount}語
                  </span>
                  <p className="mt-4 font-display font-semibold text-ink group-hover:text-signal">
                    {deck.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {deck.description}
                  </p>
                </div>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-signal">
                  学習する
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
