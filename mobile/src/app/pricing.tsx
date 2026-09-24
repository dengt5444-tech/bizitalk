import { router } from "expo-router";
import { Check, Plus, Tag } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Badge, Button, Card, Screen, SectionHeader, Text } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openStripeCheckout, openStripePortal } from "@/lib/checkout";
import { useIap } from "@/lib/iap/context";
import { CONVERSATION_MINUTES_PER_MONTH } from "@/lib/limits";
import { PLAN_LABELS, usePlan, type ConversationPlan } from "@/lib/plan";
import { fonts, radius, useColors } from "@/theme";

type PlanCard = {
  key: ConversationPlan;
  badge: string;
  // The price the plan is planned to move to after the introductory period
  // — same wording as the website, which never shows a made-up "was" price.
  futurePrice: string;
  price: string;
  accent: "signal" | "violet" | "amber";
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    key: "trial",
    badge: "先行提供価格",
    futurePrice: "¥1,980",
    price: "¥980",
    accent: "signal",
    features: [`AI英会話を月${CONVERSATION_MINUTES_PER_MONTH.trial}分まで練習`, "会話ごとのAIコーチによるフィードバック", "いつでも解約可能"],
  },
  {
    key: "standard",
    badge: "先行提供価格",
    futurePrice: "¥9,800",
    price: "¥4,990",
    accent: "violet",
    features: [
      `全31シーンでAI会話練習(月${CONVERSATION_MINUTES_PER_MONTH.standard}分まで)`,
      "リアルタイム音声・AIコーチのフィードバック",
      "マイページでの進捗トラッキング",
      "いつでも解約可能",
    ],
  },
  {
    key: "unlimited",
    badge: "先行提供価格・使い放題",
    futurePrice: "¥19,800",
    price: "¥9,900",
    accent: "amber",
    features: [
      "AI英会話が実質使い放題",
      "リアルタイム音声・AIコーチのフィードバック",
      "マイページでの進捗トラッキング",
      "いつでも解約可能",
    ],
  },
];

const IS_IOS = Platform.OS === "ios";

const FAQ: { question: string; answer: string }[] = [
  {
    question: "いつでも解約できますか?",
    answer: IS_IOS
      ? "はい、いつでも解約可能です。iPhoneの「設定」>「Apple ID」>「サブスクリプション」、またはこの画面の「サブスクリプションを管理」から解約できます。現在の期間の終了日の24時間前までに解約すると、次回以降の請求は発生しません。"
      : "はい、いつでも解約可能です。登録済みの方は「お支払い方法の変更・解約はこちら」からご自身で解約できます。解約後は次回以降の請求は発生しません。",
  },
  {
    question: "支払い方法は何がありますか?",
    answer: IS_IOS
      ? "iPhoneアプリからのご登録は、Apple IDに登録されたお支払い方法(App Storeのアプリ内課金)で決済されます。"
      : "クレジットカード(Visa, Mastercard, American Expressなど)によるお支払いに対応しています。決済はStripe社のシステムを通じて安全に処理されます。",
  },
  {
    question: "無料でどこまで試せますか?",
    answer:
      "リスニング教材と単語帳は、登録なしで全て無料でご利用いただけます。AI英会話は、登録すればどのシーンでも月5分まで無料でお試しいただけます。それ以上お話しになりたい場合は、AI英会話プランへのご登録が必要です。",
  },
  {
    question: "AI英会話の時間に上限があるのはなぜですか?",
    answer:
      "AI英会話はリアルタイムの音声AIを利用しており、話した時間に応じて実際のAPI利用コストが発生します。安定してサービスを提供し続けるため、プランごとに月あたりの利用可能時間(分)を設けています。使い放題プランも、ごく一部の極端な利用を除き実質的に使い放題となる、十分に余裕を持った時間を設定しています。",
  },
  {
    question: "Webサイトとアプリで同じアカウントを使えますか?",
    answer:
      "はい。同じメールアドレスでログインすれば、会話の記録・復習リスト・ご登録中のプランはWebサイトとアプリで共通です。どちらでご登録いただいたプランも、両方でご利用いただけます。",
  },
  {
    question: "「先行提供価格」とはなんですか?",
    answer:
      "現在ご案内している価格は、サービス立ち上げ期にご利用いただくための先行提供価格です。各プランには将来移行を予定している正式価格を明記しており、価格変更の際は事前にお知らせします(すでにご登録中の方が、通知なく値上げされることはありません)。",
  },
];

export default function PricingScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { plan: currentPlan, source, refresh } = usePlan();
  const iap = useIap();
  const [referralCode, setReferralCode] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<ConversationPlan | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const accents = {
    signal: { tint: colors.signalTint, fg: colors.signalDim },
    violet: { tint: colors.violetTint, fg: colors.violetDim },
    amber: { tint: colors.amberTint, fg: colors.amberDim },
  };

  // A plan bought on the website is billed by Stripe; buying another one
  // through the App Store on top of it would charge the user twice.
  const hasWebSubscription = !!currentPlan && currentPlan !== "admin" && source === "stripe";
  const hasAnyPlan = !!currentPlan;

  async function handleSubscribe(plan: ConversationPlan) {
    if (!user) {
      router.push("/login");
      return;
    }
    if (IS_IOS) {
      if (!iap.available) {
        Alert.alert("現在ご購入いただけません", "App Storeでの購入の準備中です。しばらくしてからもう一度お試しください。");
        return;
      }
      await iap.purchase(plan);
      return;
    }
    setCheckoutPlan(plan);
    try {
      const success = await openStripeCheckout(plan, referralCode.trim().toUpperCase());
      await refresh();
      if (success) Alert.alert("ご登録ありがとうございます", "プランが有効になりました。");
    } catch (err) {
      Alert.alert("決済ページを開けませんでした", err instanceof ApiError && err.code.length > 20 ? err.code : "もう一度お試しください。");
    } finally {
      setCheckoutPlan(null);
    }
  }

  async function handleManage() {
    if (source === "apple_iap") {
      await iap.manageSubscriptions();
      return;
    }
    if (!IS_IOS) {
      try {
        await openStripePortal();
        await refresh();
      } catch {
        Alert.alert("管理画面を開けませんでした", "時間をおいて再度お試しください。");
      }
    }
  }

  async function handleRestore() {
    if (!user) {
      router.push("/login");
      return;
    }
    const restored = await iap.restore().catch(() => -1);
    if (restored > 0) Alert.alert("購入を復元しました", "ご登録中のプランが有効になりました。");
    else if (restored === 0)
      Alert.alert(
        "復元できる購入が見つかりませんでした",
        "このApple IDで有効なサブスクリプションがないか、別のビジトークアカウントで購入されています。購入時と同じメールアドレスでログインしてください。",
      );
    else Alert.alert("復元できませんでした", "通信環境をご確認のうえ、もう一度お試しください。");
  }

  return (
    <Screen>
      <SectionHeader
        eyebrow="Pricing"
        title="料金プラン"
        description="リスニング教材と単語帳はすべて無料。もっと話す練習がしたくなったら、AI英会話プランをご検討ください。"
      />

      {currentPlan === "admin" && (
        <Card tone="signalTint">
          <Text variant="small" tone="signalDim">
            管理者アカウントのため、すべての機能をご利用いただけます。
          </Text>
        </Card>
      )}
      {hasWebSubscription && IS_IOS && (
        <Card tone="paperDim" style={{ gap: 6 }}>
          <Text variant="small" tone="ink" weight="600">
            Webサイトで{PLAN_LABELS[currentPlan]}にご登録中です
          </Text>
          <Text variant="small">
            アプリでもそのままご利用いただけます。プランの変更・解約は、ご登録いただいたWebサイトから行ってください。
          </Text>
        </Card>
      )}

      {!IS_IOS && user && (
        <Card tone="paperDim" style={{ gap: 8 }}>
          <View style={styles.row}>
            <Tag size={15} color={colors.signal} />
            <Text variant="small" tone="ink" weight="600">
              紹介コードをお持ちですか?
            </Text>
          </View>
          <Text variant="caption" tone="inkSoft">
            インフルエンサーやパートナーからコードをもらった方は、こちらに入力してください。なくても登録できます。
          </Text>
          <TextInput
            value={referralCode}
            onChangeText={(v) => setReferralCode(v.toUpperCase())}
            placeholder="例: AB12CD34"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="characters"
            style={[styles.referral, { borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink }]}
          />
        </Card>
      )}

      {PLANS.map((plan) => {
        const accent = accents[plan.accent];
        const isCurrent = currentPlan === plan.key;
        const storePrice = IS_IOS ? iap.products[plan.key]?.displayPrice : undefined;
        const busy = iap.purchasingPlan === plan.key || checkoutPlan === plan.key;
        return (
          <Card key={plan.key} style={{ alignItems: "center", gap: 10, paddingVertical: 26 }}>
            <Badge label={plan.badge} tone={plan.accent === "amber" ? "amber" : plan.accent === "violet" ? "violet" : "signal"} />
            <Text variant="small" weight="600">
              {PLAN_LABELS[plan.key]}
            </Text>
            <View style={styles.priceRow}>
              <Text style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: "600", color: colors.ink }}>
                {storePrice ?? plan.price}
              </Text>
              <Text variant="small">/月</Text>
            </View>
            <Text variant="caption" center>
              正式価格は{plan.futurePrice}/月を予定(現在は先行提供価格)
            </Text>
            <View style={{ alignSelf: "stretch", gap: 8, marginTop: 8 }}>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.row}>
                  <View style={[styles.check, { backgroundColor: accent.tint }]}>
                    <Check size={13} color={accent.fg} strokeWidth={2.5} />
                  </View>
                  <Text variant="small" style={{ flex: 1 }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ alignSelf: "stretch", marginTop: 12, gap: 8 }}>
              {isCurrent ? (
                <>
                  <View style={[styles.current, { backgroundColor: accent.tint }]}>
                    <Text variant="small" weight="600" style={{ color: accent.fg }}>
                      現在ご登録中です
                    </Text>
                  </View>
                  {(source === "apple_iap" || !IS_IOS) && (
                    <Button
                      title={source === "apple_iap" ? "サブスクリプションを管理" : "お支払い方法の変更・解約はこちら"}
                      variant="outline"
                      size="sm"
                      onPress={handleManage}
                    />
                  )}
                </>
              ) : (
                <Button
                  title={!user ? "ログインして始める" : `${storePrice ?? plan.price}で始める`}
                  loading={busy}
                  disabled={(hasAnyPlan && (IS_IOS ? hasWebSubscription || currentPlan === "admin" : true)) || iap.purchasingPlan !== null}
                  onPress={() => handleSubscribe(plan.key)}
                />
              )}
            </View>
          </Card>
        );
      })}

      {IS_IOS && hasAnyPlan && source === "apple_iap" && (
        <Text variant="caption" center>
          プランの変更は「サブスクリプションを管理」から行えます。
        </Text>
      )}

      {IS_IOS && (
        <View style={{ gap: 10 }}>
          <Button title="購入を復元" variant="outline" loading={iap.restoring} onPress={handleRestore} />
          <Text variant="caption">
            お支払いは購入の確定時にApple IDアカウントに請求されます。サブスクリプションは1か月ごとの自動更新で、現在の期間が終了する24時間以上前に自動更新をオフにしない限り、期間終了前の24時間以内に次の期間分が請求されます。購入後はApple IDの「サブスクリプション」設定から管理・解約できます。
          </Text>
          <View style={styles.legalLinks}>
            <Button title="利用規約(EULA)" variant="ghost" size="sm" onPress={() => router.push("/terms")} />
            <Button title="プライバシーポリシー" variant="ghost" size="sm" onPress={() => router.push("/privacy")} />
          </View>
        </View>
      )}

      <View style={{ gap: 10, marginTop: 12 }}>
        <Text variant="title" style={{ fontSize: 20 }}>
          よくある質問
        </Text>
        <Card padded={false} style={{ paddingHorizontal: 18 }}>
          {FAQ.map((item, i) => (
            <View key={item.question} style={[i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
              <Pressable
                onPress={() => setOpenFaq(openFaq === i ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: openFaq === i }}
                style={styles.faqQuestion}
              >
                <Text variant="small" tone="ink" weight="600" style={{ flex: 1 }}>
                  {item.question}
                </Text>
                <Plus size={18} color={colors.signal} style={{ transform: [{ rotate: openFaq === i ? "45deg" : "0deg" }] }} />
              </Pressable>
              {openFaq === i && (
                <Text variant="small" style={{ paddingBottom: 16 }}>
                  {item.answer}
                </Text>
              )}
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  current: { borderRadius: radius.pill, paddingVertical: 12, alignItems: "center" },
  referral: { height: 44, borderWidth: 1, borderRadius: radius.md, textAlign: "center", fontSize: 15, letterSpacing: 2 },
  legalLinks: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  faqQuestion: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
});
