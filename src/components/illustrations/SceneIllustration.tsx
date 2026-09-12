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

// Real photography (Pexels License: free for commercial use, no attribution
// required), downloaded into public/images/scenes/ — not hotlinked, so the
// site doesn't depend on a third party staying up. One photo per scene
// type, reused across every material/scenario that maps to that scene.
const SCENE_ALT: Record<SceneKey, string> = {
  meeting: "会議室でのミーティングの様子",
  "desk-call": "オンライン会議の様子",
  interview: "面談・面接の様子",
  negotiation: "商談・交渉の様子",
  presentation: "プレゼンテーションの様子",
  report: "レポート・データ分析の様子",
  support: "カスタマーサポートの様子",
  networking: "交流イベントの様子",
  casual: "カフェでの雑談の様子",
};

export function SceneIllustration({
  scene,
  size = "card",
  className = "",
}: {
  scene: SceneKey;
  size?: "card" | "hero";
  className?: string;
}) {
  const src = `/images/scenes/${scene}.jpg`;
  const alt = SCENE_ALT[scene];

  if (size === "hero") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`h-56 w-full object-cover sm:h-72 ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} />
  );
}
