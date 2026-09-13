import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata = {
  title: "先行無料モニター募集 | ビジトーク",
};

const FEATURES = [
  "CEO・海外の同僚・取引先など、相手役別のAIとリアルタイム音声で練習",
  "会話ごとにAIコーチが文法・語彙・丁寧さをフィードバック",
  "ビジネス英単語帳500語超、ビジネスリスニング教材も聞き放題",
];

export default function EarlyAccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-signal uppercase">
          <span className="h-px w-6 bg-signal" />
          先行無料モニター募集
        </span>
        <h1 className="mt-6 font-display text-3xl leading-[1.3] font-semibold text-ink sm:text-4xl">
          正式リリースに先立って、
          <br />
          5名様に全機能を無料でお試しいただけます
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
          ビジトークは、CEOや海外の同僚、取引先など、実在しそうな相手役とシチュエーション別にリアルタイム音声で練習するAIビジネス英会話サービスです。正式リリースに先立ち、数日間、全機能を無料でご利用いただけるモニターを抽選5名様に募集します。
        </p>
      </div>

      <ul className="mt-10 space-y-3 rounded-2xl border border-line bg-surface p-6">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
            <span className="mt-0.5 text-signal">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <WaitlistForm />
        <p className="mt-4 text-center text-xs text-ink-faint">
          応募多数の場合は抽選となります。抽選に外れた方にも、正式リリース時に優先してご案内します。
        </p>
      </div>
    </main>
  );
}
