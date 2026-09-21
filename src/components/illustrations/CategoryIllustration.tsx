"use client";

import { useId } from "react";
import type { ScenarioCategory } from "@/lib/scenarios";

// Small line-icon glyphs, one per category, drawn in a shared stroke style
// so they read as one illustration set rather than mismatched clip-art.
function Glyph({ category }: { category: ScenarioCategory }) {
  const common = {
    fill: "none",
    stroke: "white",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "teammates":
      return (
        <g {...common}>
          <path d="M20 30c0-6 5-10 11-10s11 4 11 10v3H20z" />
          <path d="M38 20c5 0 9 3 9 8v2h-6" />
          <circle cx="31" cy="15" r="6" />
          <circle cx="45" cy="17" r="4.5" />
        </g>
      );
    case "international":
      return (
        <g {...common}>
          <circle cx="32" cy="32" r="16" />
          <path d="M16 32h32M32 16c5 4 8 10 8 16s-3 12-8 16c-5-4-8-10-8-16s3-12 8-16z" />
        </g>
      );
    case "clients":
      return (
        <g {...common}>
          <path d="M14 30l8-7c1.5-1.3 3.7-1.3 5 0l3 2.8" />
          <path d="M50 30l-8-7c-1.5-1.3-3.7-1.3-5 0l-1.2 1.1" />
          <path d="M22 25l8 7-3.2 3.2c-1.6 1.6-4.2 1.6-5.8 0l-.2-.2c-1.4-1.4-1.4-3.6 0-5z" />
          <path d="M42 25l-8 7 3.2 3.2c1.6 1.6 4.2 1.6 5.8 0l.2-.2c1.4-1.4 1.4-3.6 0-5z" />
        </g>
      );
    case "interview":
      return (
        <g {...common}>
          <rect x="18" y="14" width="28" height="36" rx="4" />
          <rect x="26" y="10" width="12" height="8" rx="2" />
          <path d="M24 28h16M24 36h10" />
          <path d="M32 40l3.5 3.5L42 37" />
        </g>
      );
    case "workingHoliday":
      return (
        <g {...common}>
          <path d="M14 36l36-14-14 36-4-16-16-6z" />
        </g>
      );
    case "leadership":
    default:
      return (
        <g {...common}>
          <path d="M16 46V33M27 46V24M38 46V29M49 46V18" />
          <path d="M16 33l11-9 11 5 11-11" />
        </g>
      );
  }
}

const GRADIENTS: Record<ScenarioCategory, [string, string]> = {
  teammates: ["#3b82f6", "#1d4ed8"],
  international: ["#2dd4bf", "#0d9488"],
  clients: ["#a78bfa", "#7c3aed"],
  leadership: ["#f0ad5e", "#b45309"],
  interview: ["#818cf8", "#4f46e5"],
  workingHoliday: ["#ec4899", "#db2777"],
};

export function CategoryIllustration({
  category,
  size = 64,
  className = "",
}: {
  category: ScenarioCategory;
  size?: number;
  className?: string;
}) {
  const id = useId();
  const [from, to] = GRADIENTS[category];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`cat-grad-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#cat-grad-${id})`} />
      <Glyph category={category} />
    </svg>
  );
}
