// Ambient, full-screen visual for a realtime voice call — the audio itself
// carries the conversation, so this is deliberately not information-dense:
// a slowly breathing sphere that speeds up and swaps color depending on who
// is talking, in Harbor's own palette (signal blue for the AI, amber for
// the user — the same two colors ConversationRoom already used for the
// "話しています.../聞いています..." status text). Mirrors mobile's VoiceOrb.
export type OrbState = "connecting" | "assistant" | "user" | "muted" | "idle";

const COLORS: Record<OrbState, [string, string]> = {
  assistant: ["var(--color-signal)", "var(--color-signal-dim)"],
  user: ["var(--color-amber)", "var(--color-amber-dim)"],
  muted: ["var(--color-ink-faint)", "var(--color-line)"],
  connecting: ["var(--color-signal-dim)", "var(--color-ink)"],
  idle: ["var(--color-signal-dim)", "var(--color-ink)"],
};

export function VoiceOrb({ state }: { state: OrbState }) {
  const active = state === "assistant" || state === "user";
  const duration = active ? 1100 : state === "connecting" ? 900 : 1900;
  const [c1, c2] = COLORS[state];

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <div
        className="orb-glow absolute h-40 w-40 rounded-full"
        style={{ backgroundColor: c1, animation: `orb-glow ${duration}ms ease-in-out infinite` }}
      />
      <div
        className="orb-core h-28 w-28 rounded-full"
        style={{
          backgroundImage: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          animation: `orb-scale ${duration}ms ease-in-out infinite`,
        }}
      />
    </div>
  );
}
