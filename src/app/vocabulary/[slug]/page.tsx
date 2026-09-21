import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isListeningEntitled } from "@/lib/entitlements";
import { VocabDeckPractice } from "@/components/VocabDeckPractice";
import type { VocabWord } from "@/lib/vocab";

export const dynamic = "force-dynamic";

export default async function VocabDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: deck } = await supabase
    .from("vocab_decks")
    .select("id, slug, title, description, is_free, items")
    .eq("slug", slug)
    .maybeSingle();

  if (!deck) {
    notFound();
  }

  const user = await getCurrentUser();
  const subscribed = await isListeningEntitled(user);
  const unlocked = deck.is_free || subscribed;
  const words = (deck.items ?? []) as VocabWord[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-signal"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        単語帳一覧に戻る
      </Link>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-block rounded-full bg-signal-tint px-3 py-1 text-xs font-semibold text-signal-dim">
          {words.length}語
        </span>
        {deck.is_free && (
          <span className="inline-block rounded-full bg-amber-tint px-3 py-1 text-xs font-semibold text-amber-dim">
            無料お試し
          </span>
        )}
      </div>
      <div className="mt-3">
        <h1 className="font-display text-3xl font-semibold text-ink">{deck.title}</h1>
        <p className="mt-2 text-ink-soft">{deck.description}</p>
      </div>

      {unlocked ? (
        <VocabDeckPractice deckTitle={deck.title} words={words} isLoggedIn={!!user} />
      ) : (
        <div className="mt-8 rounded-3xl bg-paper-dim p-8 text-center shadow-card">
          <p className="font-display font-semibold text-ink">この単語帳はロックされています</p>
          <p className="mt-2 text-sm text-ink-soft">
            {user
              ? "リスニングプラン、またはAI英会話の各プランへの登録で全ての単語帳が学習できます。"
              : "ログインの上、リスニングプランまたはAI英会話プランへの登録が必要です。"}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {!user && (
              <Link
                href="/login"
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink-faint"
              >
                ログイン
              </Link>
            )}
            <Link
              href="/pricing"
              className="rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-signal-dim"
            >
              料金プランを見る
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
