import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/entitlements";
import { RemoveWordButton } from "@/components/RemoveWordButton";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/review");
  }

  const supabase = await createClient();
  const [{ data: conversationWords }, { data: listeningWords }] =
    await Promise.all([
      supabase
        .from("saved_words")
        .select("id, word, meaning, source_title, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("gakuto_saved_words")
        .select("id, word, meaning, material_title, created_at")
        .order("created_at", { ascending: false }),
    ]);

  type ReviewWord = {
    id: string;
    word: string;
    meaning: string;
    source: "conversation" | "listening";
  };

  const groups = new Map<string, ReviewWord[]>();

  for (const w of conversationWords ?? []) {
    const key = w.source_title || "AI会話";
    const list = groups.get(key) ?? [];
    list.push({ id: w.id, word: w.word, meaning: w.meaning, source: "conversation" });
    groups.set(key, list);
  }

  for (const w of listeningWords ?? []) {
    const key = w.material_title || "リスニング教材";
    const list = groups.get(key) ?? [];
    list.push({ id: w.id, word: w.word, meaning: w.meaning, source: "listening" });
    groups.set(key, list);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
        Review
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
        復習リスト
      </h1>
      <p className="mt-3 text-ink-soft">
        AI会話のフィードバックで出てきた単語や、リスニング教材の理解度テストで間違えた単語を、ここでまとめて復習できます。
      </p>

      {groups.size === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-paper-dim p-10 text-center">
          <p className="font-medium text-ink">保存された単語はまだありません</p>
          <p className="mt-2 text-sm text-ink-soft">
            AI会話を終えたあとのフィードバックや、教材の理解度テストから「復習に追加」してみましょう。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/conversation"
              className="inline-block rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-signal-dim"
            >
              会話練習へ
            </Link>
            <Link
              href="/materials"
              className="inline-block rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink-faint"
            >
              教材一覧へ
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {Array.from(groups.entries()).map(([sourceTitle, items]) => (
            <div key={sourceTitle}>
              <h2 className="text-xs font-medium tracking-[0.15em] text-ink-faint uppercase">
                {sourceTitle}
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
    </main>
  );
}
