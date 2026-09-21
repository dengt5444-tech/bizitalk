import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/entitlements";
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
    .select("id, slug, title, description, items")
    .eq("slug", slug)
    .maybeSingle();

  if (!deck) {
    notFound();
  }

  const user = await getCurrentUser();
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

      <div className="mt-5">
        <span className="inline-block rounded-full bg-signal-tint px-3 py-1 text-xs font-semibold text-signal-dim">
          {words.length}語
        </span>
      </div>
      <div className="mt-3">
        <h1 className="font-display text-3xl font-semibold text-ink">{deck.title}</h1>
        <p className="mt-2 text-ink-soft">{deck.description}</p>
      </div>

      <VocabDeckPractice deckTitle={deck.title} words={words} isLoggedIn={!!user} />
    </main>
  );
}
