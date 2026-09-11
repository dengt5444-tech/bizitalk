import { getCurrentUser, isEntitled } from "@/lib/entitlements";
import { CheckoutButton } from "@/components/CheckoutButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";

export const dynamic = "force-dynamic";

const FAQ: { question: string; answer: string }[] = [
  {
    question: "いつでも解約できますか?",
    answer:
      "はい、いつでも解約可能です。登録済みの方は上記の「お支払い方法の変更・解約はこちら」からご自身で解約できます。解約後は次回以降の請求は発生しません。",
  },
  {
    question: "支払い方法は何がありますか?",
    answer:
      "クレジットカード(Visa, Mastercard, American Expressなど)によるお支払いに対応しています。決済はStripe社のシステムを通じて安全に処理されます。",
  },
  {
    question: "無料でどこまで試せますか?",
    answer:
      "無料シーンを1つご用意しています(会話練習にはログインが必要です)。それ以外のシーンは、有料プランへの登録が必要です。",
  },
  {
    question: "料金は今後変わりますか?",
    answer:
      "現在は特別価格の月額480円でご提供していますが、将来的に通常価格の月額1,980円へ変更する予定です。価格変更の際は事前にお知らせします。",
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const subscribed = await isEntitled(user);

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
          Pricing
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          料金プラン
        </h1>
        <p className="mt-3 text-ink-soft">
          全18シーンのAI会話練習が使い放題になる、シンプルな月額プランです。
        </p>
      </div>

      <div className="mt-10 rounded-3xl border border-line bg-surface p-8 text-center">
        <span className="inline-block rounded-full bg-signal-tint px-4 py-1.5 text-xs font-semibold text-signal-dim">
          期間限定デモ価格
        </span>

        <p className="mt-4 text-sm font-medium text-ink-soft">
          スタンダードプラン
        </p>

        <div className="mt-2 flex items-end justify-center gap-3">
          <span className="text-2xl font-medium text-ink-faint line-through">
            ¥1,980
          </span>
          <span className="font-display text-5xl font-semibold text-ink">
            ¥480
          </span>
          <span className="text-base text-ink-soft">/月</span>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          ※現在はサービス開始記念の特別価格です。将来的に通常価格(¥1,980/月)に変更予定です。
        </p>

        <ul className="mt-7 space-y-2.5 text-left text-sm text-ink-soft">
          <li className="flex items-center gap-2.5">
            <span className="text-signal">✓</span>全18シーンでAI会話練習し放題(リアルタイム音声)
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-signal">✓</span>会話ごとのAIコーチによるフィードバック
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-signal">✓</span>マイページでの進捗トラッキング
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-signal">✓</span>単語復習リスト付き
          </li>
          <li className="flex items-center gap-2.5">
            <span className="text-signal">✓</span>いつでも解約可能
          </li>
        </ul>

        <div className="mt-8">
          {subscribed ? (
            <div className="space-y-3">
              <p className="rounded-full bg-signal-tint px-4 py-3 text-sm font-semibold text-signal-dim">
                現在ご登録中です
              </p>
              <ManageSubscriptionButton />
            </div>
          ) : (
            <CheckoutButton isLoggedIn={!!user} />
          )}
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
