"use client";

export function AudioPlayer({ materialId }: { materialId: string }) {
  return (
    <audio
      controls
      preload="auto"
      className="w-full accent-signal"
      src={`/api/materials/${materialId}/audio`}
    >
      お使いのブラウザは音声再生に対応していません。
    </audio>
  );
}
