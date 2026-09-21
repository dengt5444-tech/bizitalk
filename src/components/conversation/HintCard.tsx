import { Lightbulb, RotateCw } from "lucide-react";

// "Guided mode" hint: a concrete example of what the learner could say
// next. A flat tonal card (no left accent rail) with a leading icon —
// matches the tonal-container convention Material 3 uses for this kind of
// inline assistive content, in Harbor's own signal-blue tint. Mirrors
// mobile's HintCard.
export function HintCard({
  reply,
  gloss,
  loading,
  onRefresh,
  className = "",
}: {
  reply: string | null;
  gloss: string | null;
  loading: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl bg-signal-tint p-3.5 ${className}`}>
      <div className="flex items-center gap-2">
        <Lightbulb size={16} strokeWidth={2} className="shrink-0 text-signal-dim" />
        <span className="flex-1 text-[11px] font-medium tracking-wide text-signal-dim uppercase">
          こう言ってみましょう
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="別の例文を見る"
          className="shrink-0 text-signal-dim transition hover:text-signal disabled:opacity-50"
        >
          <RotateCw size={15} strokeWidth={2} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {reply && <p className="text-sm leading-relaxed font-medium text-ink">{reply}</p>}
      {gloss && <p className="text-xs leading-relaxed text-ink-soft">{gloss}</p>}
    </div>
  );
}
