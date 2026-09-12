import type { DialogueLine } from "@/lib/materials";

const SPEAKER_STYLE: Record<DialogueLine["speaker"], string> = {
  A: "bg-signal-tint text-signal-dim",
  B: "bg-amber-tint text-amber-dim",
};

const SPEAKER_BADGE: Record<DialogueLine["speaker"], string> = {
  A: "bg-signal",
  B: "bg-amber",
};

export function DialogueTranscript({
  dialogue,
}: {
  dialogue: DialogueLine[];
}) {
  return (
    <div className="space-y-2">
      {dialogue.map((line, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-xl p-3 ${SPEAKER_STYLE[line.speaker]}`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-paper ${SPEAKER_BADGE[line.speaker]}`}
          >
            {line.speaker}
          </span>
          <p className="leading-relaxed">{line.text}</p>
        </div>
      ))}
    </div>
  );
}
