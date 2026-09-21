const PALETTE = [
  { bg: "bg-signal-tint", text: "text-signal-dim" },
  { bg: "bg-amber-tint", text: "text-amber-dim" },
  { bg: "bg-mint-tint", text: "text-mint-dim" },
  { bg: "bg-violet-tint", text: "text-violet-dim" },
  { bg: "bg-blossom-tint", text: "text-blossom-dim" },
  { bg: "bg-rose-tint", text: "text-rose" },
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const { bg, text } = PALETTE[hashString(name) % PALETTE.length];

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${bg} ${text} ${SIZE_CLASSES[size]} ${className}`}
    >
      {initialsFor(name)}
    </span>
  );
}
