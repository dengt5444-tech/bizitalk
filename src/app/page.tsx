import Link from "next/link";
import { Avatar } from "@/components/Avatar";

const FEATURES = [
  {
    number: "01",
    title: "相手が変われば、英語も変わる",
    description:
      "CEOへの報告、インドの同僚とのスタンドアップ、取引先との交渉——誰と話すかでキャラクター設定されたAIが変わり、その場に合った英語を練習できます。",
  },
  {
    number: "02",
    title: "リアルタイム音声で、本物の会話のように",
    description:
      "対応ブラウザではAIとマイクごしに低遅延で会話。相手の話を遮ったり、間が空いたり——本物の会話に近い緊張感の中で練習できます。",
  },
  {
    number: "03",
    title: "会話後にAIコーチがフィードバック",
    description:
      "話し終えると、言い間違いの修正・良かった表現・使うと良い単語を分析。文法・語彙・丁寧さをスコアで可視化し、話すたびに弱点がはっきりします。",
  },
  {
    number: "04",
    title: "記録が残るから、成長が見える",
    description:
      "マイページでフルエンシースコアの推移や継続日数を確認。過去の会話とフィードバックはいつでも見返せて、苦手な表現は復習リストに残ります。",
  },
];

const PERSONAS = [
  { name: "Michael Chen", role: "CEO(アメリカ)" },
  { name: "Priya Sharma", role: "開発チームリード(インド)" },
  { name: "Oliver Bennett", role: "マネージャー(イギリス)" },
  { name: "Morgan Lee", role: "新規クライアント" },
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-signal-tint),transparent)]"
        />
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
          <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-signal uppercase">
            <span className="h-px w-6 bg-signal" />
            無料のシーンからお試しいただけます
          </span>
          <h1 className="mt-8 font-display text-4xl leading-[1.25] font-semibold text-ink sm:text-6xl sm:leading-[1.2]">
            誰と話すかで、
            <br />
            英語は変わる。
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            ビジトークは、CEOや海外の同僚、取引先など、実在しそうな相手役とシチュエーション別にリアルタイム音声で練習するAIビジネス英会話サービスです。会話のたびにAIコーチが弱点をフィードバックするから、話すほど着実に力がつきます。
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/conversation"
              className="rounded-full bg-signal px-8 py-3.5 text-base font-medium text-paper shadow-sm transition hover:bg-signal-dim"
            >
              AIと話してみる(無料)
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-line px-8 py-3.5 text-base font-medium text-ink transition hover:border-ink-faint"
            >
              料金プランを見る
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-dim">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <p className="text-center font-display text-sm tracking-[0.3em] text-ink-faint uppercase">
            Who you&apos;ll talk to
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PERSONAS.map((persona) => (
              <div
                key={persona.name}
                className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center"
              >
                <Avatar name={persona.name} />
                <p className="text-sm font-medium text-ink">{persona.name}</p>
                <p className="text-xs text-ink-faint">{persona.role}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-ink-soft">
            ほかにも、シンガポールやドイツの同僚、投資家、採用面接官など全18シーンをご用意しています。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
            Features
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
            話して、直されて、身につく。
          </h2>
        </div>

        <div className="mt-12 divide-y divide-line border-t border-line">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="grid gap-2 py-8 sm:grid-cols-[5rem_1fr] sm:gap-8"
            >
              <p className="font-display text-2xl text-ink-faint">
                {feature.number}
              </p>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-ink">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
            次に話す相手を、
            <br className="sm:hidden" />
            今日決めてみませんか。
          </h2>
          <div className="mt-8">
            <Link
              href="/conversation"
              className="inline-block rounded-full bg-signal px-8 py-3.5 text-base font-medium text-paper transition hover:bg-signal-dim"
            >
              無料のシーンから始める
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
