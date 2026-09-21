"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Fades + rises each section into view the first time it crosses into the
// viewport while scrolling, so the page reads as alive rather than a
// static document — mirrors the scroll-triggered motion on m3.material.io.
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Always starts false — on both the server and the client's first
  // render — so hydration never has to reconcile a mismatch. Checking
  // `typeof IntersectionObserver` in the initializer looked reasonable
  // (fall back to always-visible when unsupported) but IntersectionObserver
  // is also undefined in Node during SSR, so the server always rendered
  // "already revealed" while the client's first render came back "not yet
  // revealed" — a guaranteed mismatch on every load, in every browser,
  // which also meant the reveal animation itself never actually played for
  // any real visitor. The unsupported-browser fallback now happens in the
  // effect below instead, after hydration has already settled.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Essentially unreachable in any evergreen browser — this only runs
      // once, on mount, and only for visitors on very old browsers, so the
      // extra render it causes is a non-issue in practice.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={visible}
      className={className}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
