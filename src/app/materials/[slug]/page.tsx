import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/entitlements";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Quiz } from "@/components/Quiz";
import { VocabList } from "@/components/VocabList";
import { DialogueTranscript } from "@/components/DialogueTranscript";
import {
  EXCLUDED_MATERIAL_SLUGS,
  LEVEL_LABELS,
  MATERIAL_SCENES,
  type DialogueLine,
  type MaterialLevel,
  type QuizQuestion,
  type VocabItem,
} from "@/lib/materials";
import { SceneIllustration } from "@/components/illustrations/SceneIllustration";

export const dynamic = "force-dynamic";

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (EXCLUDED_MATERIAL_SLUGS.has(slug)) {
    notFound();
  }
  const supabase = await createClient();
  const { data: material } = await supabase
    .from("gakuto_materials")
    .select(
      "id, slug, title, description, script, vocab, quiz, dialogue, level",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!material) {
    notFound();
  }

  const user = await getCurrentUser();
  const vocab = (material.vocab ?? []) as VocabItem[];
  const quiz = (material.quiz ?? []) as QuizQuestion[];
  const dialogue = (material.dialogue ?? []) as DialogueLine[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <Link
        href="/materials"
        className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-signal"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        教材一覧に戻る
      </Link>

      <div className="mt-5 overflow-hidden rounded-2xl">
        <SceneIllustration
          scene={MATERIAL_SCENES[material.slug] ?? "report"}
          size="hero"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-block rounded-full bg-signal-tint px-3 py-1 text-xs font-semibold text-signal-dim">
          {LEVEL_LABELS[(material.level as MaterialLevel) ?? "beginner"]}
        </span>
      </div>
      <div className="mt-3">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {material.title}
        </h1>
        <p className="mt-2 text-ink-soft">{material.description}</p>
      </div>

      <div className="mt-8 space-y-6">
        <div className="rounded-3xl bg-surface p-6 shadow-card">
          <AudioPlayer materialId={material.id} />
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-semibold text-signal">
              スクリプトを表示
            </summary>
            <div className="mt-3">
              {dialogue.length > 0 ? (
                <DialogueTranscript dialogue={dialogue} />
              ) : (
                <p className="leading-relaxed text-ink-soft whitespace-pre-wrap">
                  {material.script}
                </p>
              )}
            </div>
          </details>
        </div>

        <VocabList
          materialId={material.id}
          materialTitle={material.title}
          vocab={vocab}
          isLoggedIn={!!user}
        />

        <Quiz
          materialId={material.id}
          materialTitle={material.title}
          questions={quiz}
          isLoggedIn={!!user}
        />
      </div>
    </main>
  );
}
