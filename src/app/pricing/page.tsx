import {
  getConversationPlan,
  getCurrentUser,
  isListeningEntitled,
} from "@/lib/entitlements";
import { CheckoutButton } from "@/components/CheckoutButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { CONVERSATION_SESSIONS_PER_MONTH } from "@/lib/limits";

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
    question: "AI英会話の回数に上限があるのはなぜですか?",
    answer:
      "AI英会話はリアルタイムの音声AIを利用しており、1回の会話ごとに実際のAPI利用コストが発生します。安定してサービスを提供し続けるため、お試し・スタンダードプランは月あたりの回数を設けています。使い放題プランも、ごく一部の極端な利用を除き実質的に使い放題となる、十分に余裕を持った回数を設定しています。",
  },
  {
    question: "リスニング教材はどのプランでも使えますか?",
    answer:
      "リスニングプランのほか、お試し・スタンダード・使い放題プランのいずれかにご登録いただいても、リスニング教材は聞き放題でご利用いただけます。",
  },
  {
    question: "「先行提供価格」とはなんですか?",
    answer:
      "現在ご案内している価格は、サービス立ち上げ期にご利用いただくための先行提供価格です。各プランには将来移行を予定している正式価格を明記しており、価格変更の際は事前にお知らせします(すでにご登録中の方が、通知なく値上げされることはありません)。",
  },
];

type PlanCard = {
  key: "listening" | "trial" | "standard" | "unlimited";
  badge: string;
  name: string;
  // The price this plan is genuinely planned to move to later, once the
  // introductory period ends — never a number invented purely to look
  // like a bigger discount. Framed as a forward-looking plan (not a
  // struck-through "was" price implying past sales history), since Japan's
  // Act against Unjustifiable Premiums and Misleading Representations
  // (景品表示法) treats a fabricated "original price" that was never
  // actually charged as a misleading dual-price display.
  futurePrice: string;
  price: string;
  accent: "amber" | "signal";
  features: string[];
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const [conversationPlan, listeningSubscribed] = await Promise.all([
    getConversationPlan(user),
    isListeningEntitled(user),
  ]);

  const plans: PlanCard[] = [
    {
      key: "listening",
      badge: "先行提供価格",
      name: "リスニングプラン",
      futurePrice: "¥1,980",
      price: "¥490",
      accent: "amber",
      features: [
        "全教材が聞き放題",
        "スクリプト・単語リスト付き",
        "理解度テストと単語復習リスト",
        "いつでも解約可能",
      ],
    },
    {
      key: "trial",
      badge: "先行提供価格",
      name: "お試しプラン",
      futurePrice: "¥1,980",
      price: "¥980",
      accent: "signal",
      features: [
        `AI英会話を月${CONVERSATION_SESSIONS_PER_MONTH.trial}回まで練習`,
        "リスニング教材は聞き放題",
        "会話ごとのAIコーチによるフィードバック",
        "いつでも解約可能",
      ],
    },
    {
      key: "standard",
      badge: "先行提供価格",
      name: "スタンダードプラン",
      futurePrice: "¥9,800",
      price: "¥4,990",
      accent: "signal",
      features: [
        `全26シーンでAI会話練習(月${CONVERSATION_SESSIONS_PER_MONTH.standard}回まで)`,
        "リスニング教材は聞き放題",
        "リアルタイム音声・AIコーチのフィードバック",
        "マイページでの進捗トラッキング",
        "いつでも解約可能",
      ],
    },
    {
      key: "unlimited",
      badge: "先行提供価格・使い放題",
      name: "AI英会話使い放題プラン",
      futurePrice: "¥19,800",
      price: "¥9,900",
      accent: "signal",
      features: [
        "AI英会話が実質使い放題",
        "リスニング教材は聞き放題",
        "リアルタイム音声・AIコーチのフィードバック",
        "マイページでの進捗トラッキング",
        "いつでも解約可能",
      ],
    },
  ];

  const isCurrentPlan = (key: PlanCard["key"]) => {
    if (key === "listening") {
      // Bundled into every AI tier too, but "current plan" here means the
      // standalone listening purchase specifically.
      return listeningSubscribed && conversationPlan === null;
    }
    return conversationPlan === key;
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-signal uppercase">
          Pricing
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          料金プラン
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          話す練習(AI英会話)と聞く練習(リスニング)、それぞれのペースに合わせて選べる4つのプランをご用意しています。
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {plans.map((plan) => {
          const accentText = plan.accent === "amber" ? "text-amber-dim" : "text-signal";
          const accentTint = plan.accent === "amber" ? "bg-amber-tint" : "bg-signal-tint";
          const accentTintText = plan.accent === "amber" ? "text-amber-dim" : "text-signal-dim";
          const current = isCurrentPlan(plan.key);

          return (
            <div
              key={plan.key}
              className="rounded-3xl border border-line bg-surface p-8 text-center"
            >
              <span className={`inline-block rounded-full ${accentTint} px-4 py-1.5 text-xs font-semibold ${accentTintText}`}>
                {plan.badge}
              </span>

              <p className="mt-4 text-sm font-medium text-ink-soft">{plan.name}</p>

              <div className="mt-2 flex items-end justify-center gap-2">
                <span className="font-display text-4xl font-semibold text-ink">
                  {plan.price}
                </span>
                <span className="text-sm text-ink-soft">/月</span>
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                正式価格は{plan.futurePrice}/月を予定(現在は先行提供価格)
              </p>

              <ul className="mt-7 space-y-2.5 text-left text-sm text-ink-soft">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <span className={accentText}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {current ? (
                  <div className="space-y-3">
                    <p className={`rounded-full ${accentTint} px-4 py-3 text-sm font-semibold ${accentTintText}`}>
                      現在ご登録中です
                    </p>
                    <ManageSubscriptionButton
                      plan={plan.key === "listening" ? "listening" : "conversation"}
                    />
                  </div>
                ) : (
                  <CheckoutButton isLoggedIn={!!user} plan={plan.key} />
                )}
              </div>
            </div>
          );
        })}
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
