import {
  getCurrentUser,
  isEntitled,
  isListeningEntitled,
} from "@/lib/entitlements";
import { CheckoutButton } from "@/components/CheckoutButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { MAX_CONVERSATION_SESSIONS_PER_MONTH } from "@/lib/limits";

export const dynamic = "force-dynamic";

const FAQ: { question: string; answer: string }[] = [
  {
    question: "いつでも解約できますか?",
    answer:
      "はい、いつでも解約可能です。登録済みの方は各プランの「お支払い方法の変更・解約はこちら」からご自身で解約できます。解約後は次回以降の請求は発生しません。",
  },
  {
    question: "支払い方法は何がありますか?",
    answer:
      "クレジットカード(Visa, Mastercard, American Expressなど)によるお支払いに対応しています。決済はStripe社のシステムを通じて安全に処理されます。",
  },
  {
    question: "無料でどこまで試せますか?",
    answer:
      "AI会話・リスニング教材とも、それぞれ無料のシーン・教材を1つずつご用意しています(利用にはログインが必要です)。それ以外は各プランへの登録が必要です。",
  },
  {
    question: "AI英会話に回数制限があるのはなぜですか?",
    answer: `AI英会話はリアルタイムの音声AIを利用しており、1回の会話ごとに実際のAPI利用コストが発生します。安定してサービスを提供し続けるため、AI英会話プランは月${MAX_CONVERSATION_SESSIONS_PER_MONTH}回までとさせていただいています。リスニング教材は音声を一度生成して使い回す仕組みのため、聞き放題でご利用いただけます。`,
  },
  {
    question: "料金は今後変わりますか?",
    answer:
      "現在はどちらのプランもサービス開始記念の特別価格でご提供しています。将来的に通常価格へ変更する可能性があり、その際は事前にお知らせします。",
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const [conversationSubscribed, listeningSubscribed] = await Promise.all([
    isEntitled(user),
    isListeningEntitled(user),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
          Pricing
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          料金プラン
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          話す練習(AI英会話)と聞く練習(リスニング)、それぞれ別のプランでご利用いただけます。両方登録することも、どちらか一方だけご利用いただくことも可能です。
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center">
          <span className="inline-block rounded-full bg-amber-tint px-4 py-1.5 text-xs font-semibold text-amber-dim">
            期間限定デモ価格
          </span>

          <p className="mt-4 text-sm font-medium text-ink-soft">
            リスニングプラン
          </p>

          <div className="mt-2 flex items-end justify-center gap-3">
            <span className="text-xl font-medium text-ink-faint line-through">
              ¥1,980
            </span>
            <span className="font-display text-4xl font-semibold text-ink">
              ¥490
            </span>
            <span className="text-sm text-ink-soft">/月</span>
          </div>

          <ul className="mt-7 space-y-2.5 text-left text-sm text-ink-soft">
            <li className="flex items-center gap-2.5">
              <span className="text-amber-dim">✓</span>全教材が聞き放題
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-amber-dim">✓</span>スクリプト・単語リスト付き
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-amber-dim">✓</span>理解度テストと単語復習リスト
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-amber-dim">✓</span>いつでも解約可能
            </li>
          </ul>

          <div className="mt-8">
            {listeningSubscribed ? (
              <div className="space-y-3">
                <p className="rounded-full bg-amber-tint px-4 py-3 text-sm font-semibold text-amber-dim">
                  現在ご登録中です
                </p>
                <ManageSubscriptionButton plan="listening" />
              </div>
            ) : (
              <CheckoutButton isLoggedIn={!!user} plan="listening" />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-8 text-center">
          <span className="inline-block rounded-full bg-signal-tint px-4 py-1.5 text-xs font-semibold text-signal-dim">
            期間限定デモ価格
          </span>

          <p className="mt-4 text-sm font-medium text-ink-soft">
            AI英会話プラン
          </p>

          <div className="mt-2 flex items-end justify-center gap-3">
            <span className="text-xl font-medium text-ink-faint line-through">
              ¥4,980
            </span>
            <span className="font-display text-4xl font-semibold text-ink">
              ¥2,980
            </span>
            <span className="text-sm text-ink-soft">/月</span>
          </div>

          <ul className="mt-7 space-y-2.5 text-left text-sm text-ink-soft">
            <li className="flex items-center gap-2.5">
              <span className="text-signal">✓</span>
              全18シーンでAI会話練習(月{MAX_CONVERSATION_SESSIONS_PER_MONTH}
              回まで)
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-signal">✓</span>リアルタイム音声で会話
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-signal">✓</span>会話ごとのAIコーチによるフィードバック
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-signal">✓</span>マイページでの進捗トラッキング
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-signal">✓</span>いつでも解約可能
            </li>
          </ul>

          <div className="mt-8">
            {conversationSubscribed ? (
              <div className="space-y-3">
                <p className="rounded-full bg-signal-tint px-4 py-3 text-sm font-semibold text-signal-dim">
                  現在ご登録中です
                </p>
                <ManageSubscriptionButton plan="conversation" />
              </div>
            ) : (
              <CheckoutButton isLoggedIn={!!user} plan="conversation" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="font-display text-xl font-semibold text-ink">
          よくある質問
        </h2>
        <div className="mt-5 divide-y divide-line border-t border-line">
          {FAQ.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-ink marker:content-none">
                <span className="flex items-center justify-between">
                  {item.question}
                  <span className="text-signal transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
