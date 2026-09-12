"use client";

import { useId } from "react";

export type SceneKey =
  | "meeting"
  | "desk-call"
  | "interview"
  | "negotiation"
  | "presentation"
  | "report"
  | "support"
  | "networking"
  | "casual";

const GRADIENTS: Record<SceneKey, [string, string]> = {
  meeting: ["#3b82f6", "#1d4ed8"],
  "desk-call": ["#38bdf8", "#0e5f8f"],
  interview: ["#6366f1", "#3730a3"],
  negotiation: ["#f0ad5e", "#b45309"],
  presentation: ["#1d4ed8", "#0b1e4d"],
  report: ["#0ea5a5", "#0f5757"],
  support: ["#f4716b", "#b91c1c"],
  networking: ["#f0ad5e", "#1d4ed8"],
  casual: ["#f7c98a", "#c07a2e"],
};

function Glyph({ scene }: { scene: SceneKey }) {
  const common = {
    fill: "none",
    stroke: "white",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (scene) {
    case "meeting":
      return (
        <g {...common}>
          <ellipse cx="32" cy="34" rx="16" ry="9" />
          <circle cx="16" cy="26" r="3.2" />
          <circle cx="48" cy="26" r="3.2" />
          <circle cx="32" cy="20" r="3.2" />
        </g>
      );
    case "desk-call":
      return (
        <g {...common}>
          <rect x="14" y="20" width="36" height="22" rx="3" />
          <path d="M21 46h22" />
          <path d="M22 28l6 6 6-6 6 6 6-6" />
        </g>
      );
    case "interview":
      return (
        <g {...common}>
          <rect x="20" y="16" width="24" height="30" rx="3" />
          <path d="M25 25h14M25 31h14M25 37h9" />
        </g>
      );
    case "negotiation":
      return (
        <g {...common}>
          <path d="M14 30l8-7c1.5-1.3 3.7-1.3 5 0l3 2.8" />
          <path d="M50 30l-8-7c-1.5-1.3-3.7-1.3-5 0l-1.2 1.1" />
          <path d="M22 25l8 7-3.2 3.2c-1.6 1.6-4.2 1.6-5.8 0l-.2-.2c-1.4-1.4-1.4-3.6 0-5z" />
          <path d="M42 25l-8 7 3.2 3.2c1.6 1.6 4.2 1.6 5.8 0l.2-.2c1.4-1.4 1.4-3.6 0-5z" />
        </g>
      );
    case "presentation":
      return (
        <g {...common}>
          <rect x="14" y="14" width="36" height="22" rx="2" />
          <path d="M22 30l7-8 6 5 9-10" />
          <path d="M26 44h12M32 36v8" />
        </g>
      );
    case "report":
      return (
        <g {...common}>
          <rect x="18" y="12" width="28" height="36" rx="3" />
          <path d="M24 34l6-7 5 4 7-9" />
          <path d="M24 42h16" />
        </g>
      );
    case "support":
      return (
        <g {...common}>
          <path d="M18 32v-4a14 14 0 0128 0v4" />
          <rect x="14" y="30" width="8" height="12" rx="3" />
          <rect x="42" y="30" width="8" height="12" rx="3" />
          <path d="M32 46a20 20 0 01-4-.4" />
        </g>
      );
    case "networking":
      return (
        <g {...common}>
          <circle cx="22" cy="24" r="6" />
          <circle cx="42" cy="24" r="6" />
          <circle cx="32" cy="42" r="6" />
          <path d="M26 27l4 11M38 27l-4 11" />
        </g>
      );
    case "casual":
    default:
      return (
        <g {...common}>
          <path d="M18 26h22v10a11 11 0 01-11 11 11 11 0 01-11-11z" />
          <path d="M40 29h4a5 5 0 010 10h-4" />
          <path d="M23 20c0-2 2-2 2-4M30 20c0-2 2-2 2-4" />
        </g>
      );
  }
}

export function SceneIllustration({
  scene,
  size = "card",
  pixelSize = 56,
  className = "",
}: {
  scene: SceneKey;
  size?: "card" | "hero";
  /** Pixel width/height when size="card" (ignored for "hero", which is responsive). */
  pixelSize?: number;
  className?: string;
}) {
  const id = useId();
  const [from, to] = GRADIENTS[scene];

  if (size === "card") {
    return (
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={className}
      >
        <defs>
          <linearGradient id={`scene-grad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#scene-grad-${id})`} />
        <Glyph scene={scene} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id={`scene-hero-grad-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <filter id={`scene-hero-blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="320" height="180" rx="20" fill={`url(#scene-hero-grad-${id})`} />
      <circle cx="60" cy="150" r="70" fill="white" opacity="0.08" filter={`url(#scene-hero-blur-${id})`} />
      <circle cx="270" cy="20" r="60" fill="white" opacity="0.1" filter={`url(#scene-hero-blur-${id})`} />
      <g transform="translate(96,58) scale(2)">
        <Glyph scene={scene} />
      </g>
    </svg>
  );
}
