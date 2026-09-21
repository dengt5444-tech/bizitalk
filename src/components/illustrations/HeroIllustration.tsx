"use client";

import { useId } from "react";

// An abstract, brand-colored composition standing in for a "voice call in
// progress" moment: two soft gradient blobs, a waveform between them, and a
// scattering of small dots suggesting the many different people you can
// practice with. Deliberately abstract rather than a stock photo of a
// person, to avoid implying any specific real individual.
export function HeroIllustration({ className = "" }: { className?: string }) {
  const id = useId();
  const bars = [10, 22, 14, 30, 18, 26, 12, 20, 15, 24, 11, 17];

  return (
    <svg
      viewBox="0 0 480 400"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id={`hero-a-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`hero-b-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#f0ad5e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`hero-c-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
        </linearGradient>
        <filter id={`hero-blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <ellipse
        cx="250"
        cy="90"
        rx="90"
        ry="80"
        fill={`url(#hero-c-${id})`}
        filter={`url(#hero-blur-${id})`}
        className="hero-blob-c"
      />
      <ellipse
        cx="150"
        cy="160"
        rx="150"
        ry="130"
        fill={`url(#hero-a-${id})`}
        filter={`url(#hero-blur-${id})`}
        className="hero-blob-a"
      />
      <ellipse
        cx="340"
        cy="240"
        rx="140"
        ry="120"
        fill={`url(#hero-b-${id})`}
        filter={`url(#hero-blur-${id})`}
        className="hero-blob-b"
      />

      <g transform="translate(140,180)">
        <rect x="0" y="0" width="200" height="90" rx="20" fill="var(--color-surface)" opacity="0.92" />
        {bars.map((h, i) => (
          <rect
            key={i}
            x={16 + i * 15}
            y={45 - h / 2}
            width="7"
            height={h}
            rx="3.5"
            fill={
              ["var(--color-signal)", "var(--color-mint)", "var(--color-violet)", "var(--color-amber)"][
                i % 4
              ]
            }
            className="eq-bar"
            style={{ animationDelay: `${i * 0.09}s` }}
          />
        ))}
      </g>

      <circle cx="90" cy="90" r="14" fill="var(--color-surface)" opacity="0.9" className="hero-dot" style={{ animationDelay: "0s" }} />
      <circle cx="400" cy="120" r="10" fill="var(--color-surface)" opacity="0.85" className="hero-dot" style={{ animationDelay: "1s" }} />
      <circle cx="370" cy="330" r="16" fill="var(--color-surface)" opacity="0.9" className="hero-dot" style={{ animationDelay: "2s" }} />
      <circle cx="70" cy="300" r="11" fill="var(--color-surface)" opacity="0.85" className="hero-dot" style={{ animationDelay: "0.5s" }} />
    </svg>
  );
}
