import { useRouter } from "expo-router";
import { isUserCancelledError, useIAP, type ExpoPurchaseError, type Purchase } from "expo-iap";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { openBillingPortal, startCheckout, type CheckoutPlan } from "@/lib/checkout";
import type { ConversationPlan } from "@/lib/entitlements";
import { ALL_IAP_PRODUCT_IDS, IAP_PRODUCT_ID_FOR_PLAN, verifyApplePurchase } from "@/lib/iap";
import { useTheme } from "@/theme/ThemeProvider";
import { ReferralCodeField } from "./ReferralCodeField";

const CONVERSATION_MINUTES_PER_MONTH = { trial: 45, standard: 200, unlimited: 450 };

type PlanCard = {
  key: CheckoutPlan;
  badge: string;
  name: string;
  futurePrice: string;
  price: string;
  accent: "amber" | "signal";
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    key: "listening",
    badge: "先行提供価格",
    name: "リスニングプラン",
    futurePrice: "¥1,980",
    price: "¥490",
    accent: "amber",
    features: ["全教材が聞き放題", "スクリプト・単語リスト付き", "理解度テストと単語復習リスト", "いつでも解約可能"],
  },
  {
    key: "trial",
    badge: "先行提供価格",
    name: "お試しプラン",
    futurePrice: "¥1,980",
    price: "¥980",
    accent: "signal",
    features: [
      `AI英会話を月${CONVERSATION_MINUTES_PER_MONTH.trial}分まで練習`,
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
      `全26シーンでAI会話練習(月${CONVERSATION_MINUTES_PER_MONTH.standard}分まで)`,
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

export function PricingPlans({
  isLoggedIn,
  conversationPlan,
  listeningSubscribed,
  onCheckoutReturn,
}: {
  isLoggedIn: boolean;
  conversationPlan: ConversationPlan | null;
  listeningSubscribed: boolean;
  onCheckoutReturn?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlan | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  // StoreKit purchase flow (iOS only — Android keeps the Stripe checkout
  // above). Apple's guideline 3.1.1 requires digital subscriptions consumed
  // in the app to sell through In-App Purchase; this AI conversation
  // service doesn't qualify for the "reader app" exception.
  const { connected, subscriptions, requestPurchase, finishTransaction, getAvailablePurchases, fetchProducts } =
    useIAP({
      onPurchaseSuccess: handleIosPurchaseSuccess,
      onPurchaseError: handleIosPurchaseError,
    });

  useEffect(() => {
    if (Platform.OS !== "ios" || !connected || ALL_IAP_PRODUCT_IDS.length === 0) return;
    fetchProducts({ skus: ALL_IAP_PRODUCT_IDS, type: "subs" }).catch(() => {
      // Ignored — the purchase button falls back to the marketing price
      // shown on the card until the App Store Connect catalog loads.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchProducts identity is stable from the hook; only re-fetch when the connection state changes.
  }, [connected]);

  function isCurrentPlan(key: PlanCard["key"]) {
    if (key === "listening") return listeningSubscribed && conversationPlan === null;
    return conversationPlan === key;
  }

  async function handleCheckout(plan: CheckoutPlan) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setError("");
    setLoadingPlan(plan);
    try {
      const result = await startCheckout(plan, referralCode);
      if (result.type === "success") onCheckoutReturn?.();
    } catch {
      setError("決済ページを開けませんでした。もう一度お試しください。");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleIosPurchase(plan: CheckoutPlan) {
    if (!isLoggedIn || !user) {
      router.push("/login");
      return;
    }
    const sku = IAP_PRODUCT_ID_FOR_PLAN[plan];
    if (!sku) {
      setError("このプランは現在ご購入いただけません。");
      return;
    }
    setError("");
    setLoadingPlan(plan);
    try {
      await requestPurchase({
        type: "subs",
        request: {
          apple: {
            sku,
            appAccountToken: user.id,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
      });
      // Resolves once the purchase sheet is dispatched, not once the
      // purchase finishes — loadingPlan is cleared from the
      // onPurchaseSuccess/onPurchaseError listeners below instead.
    } catch (err) {
      setLoadingPlan(null);
      if (!isUserCancelledError(err)) {
        setError("購入処理を開始できませんでした。もう一度お試しください。");
      }
    }
  }

  async function handleIosPurchaseSuccess(purchase: Purchase) {
    try {
      const signedTransactionInfo = purchase.purchaseToken;
      if (!signedTransactionInfo) throw new Error("missing_jws");
      await verifyApplePurchase(signedTransactionInfo);
      await finishTransaction({ purchase, isConsumable: false });
      onCheckoutReturn?.();
    } catch {
      setError("購入の確認に失敗しました。時間をおいて「購入を復元」からもう一度お試しください。");
    } finally {
      setLoadingPlan(null);
      setRestoring(false);
    }
  }

  function handleIosPurchaseError(purchaseError: ExpoPurchaseError) {
    setLoadingPlan(null);
    setRestoring(false);
    if (isUserCancelledError(purchaseError)) return;
    setError("購入処理でエラーが発生しました。もう一度お試しください。");
  }

  async function handleRestorePurchases() {
    setError("");
    setRestoring(true);
    try {
      // Routes every currently-active App Store transaction back through
      // onPurchaseSuccess above, so each one gets re-verified against the
      // backend and re-synced as this user's entitlement.
      await getAvailablePurchases({ alsoPublishToEventListenerIOS: true, onlyIncludeActiveItemsIOS: true });
    } catch {
      setError("購入の復元に失敗しました。もう一度お試しください。");
    } finally {
      setRestoring(false);
    }
  }

  async function handleManage(plan: "conversation" | "listening") {
    setError("");
    setLoadingPlan(plan === "listening" ? "listening" : "standard");
    try {
      const result = await openBillingPortal(plan);
      if (result.type === "success") onCheckoutReturn?.();
    } catch {
      setError("管理画面を開けませんでした。時間をおいて再度お試しください。");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <View style={{ gap: 20 }}>
      {isLoggedIn && <ReferralCodeField onChange={setReferralCode} />}

      {!!error && (
        <Text size={13} color="rose" style={{ textAlign: "center" }}>
          {error}
        </Text>
      )}

      <View style={{ gap: 14 }}>
        {PLANS.map((plan) => {
          const accentText = plan.accent === "amber" ? "amberDim" : "signal";
          const current = isCurrentPlan(plan.key);
          const isLoading = loadingPlan === plan.key;
          const iosSku = IAP_PRODUCT_ID_FOR_PLAN[plan.key];
          const iosProduct = subscriptions.find((subscription) => subscription.id === iosSku);

          return (
            <Card key={plan.key} style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
              <Badge label={plan.badge} accent={plan.accent} />
              <Text size={13} weight="medium" color="inkSoft">
                {plan.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                <Heading level={2}>{plan.price}</Heading>
                <Text size={13} color="inkSoft">
                  /月
                </Text>
              </View>
              <Text size={11} color="inkFaint">
                正式価格は{plan.futurePrice}/月を予定(現在は先行提供価格)
              </Text>

              <View style={{ gap: 6, alignSelf: "stretch" }}>
                {plan.features.map((feature) => (
                  <View key={feature} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Text size={13} color={accentText as "amberDim" | "signal"}>
                      ✓
                    </Text>
                    <Text size={13} color="inkSoft" style={{ flex: 1, lineHeight: 18 }}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {current ? (
                <View style={{ gap: 10, alignSelf: "stretch", alignItems: "center" }}>
                  <View
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: plan.accent === "amber" ? theme.colors.amberTint : theme.colors.signalTint,
                    }}
                  >
                    <Text size={13} weight="semibold" color={accentText as "amberDim" | "signal"}>
                      現在ご登録中です
                    </Text>
                  </View>
                  <Button
                    label="お支払い方法の変更・解約はこちら"
                    variant="secondary"
                    loading={isLoading}
                    onPress={() => handleManage(plan.key === "listening" ? "listening" : "conversation")}
                  />
                </View>
              ) : Platform.OS === "ios" ? (
                // Apple's App Store guideline 3.1.1 requires digital
                // subscriptions consumed in the app to sell through StoreKit
                // In-App Purchase — this AI conversation service doesn't
                // qualify for the "reader app" exception that lets some apps
                // sell externally. Managing/cancelling an *existing*
                // subscription above is a different, allowed case, so that
                // button stays on every platform regardless of source.
                <Button
                  label={
                    isLoading
                      ? "処理中..."
                      : iosProduct
                        ? `${iosProduct.displayPrice}で始める`
                        : `${plan.price}で始める`
                  }
                  loading={isLoading}
                  disabled={!iosSku}
                  onPress={() => handleIosPurchase(plan.key)}
                  fullWidth
                />
              ) : (
                <Button
                  label={isLoading ? "処理中..." : `${plan.price}で始める`}
                  loading={isLoading}
                  onPress={() => handleCheckout(plan.key)}
                  fullWidth
                />
              )}
            </Card>
          );
        })}
      </View>

      {Platform.OS === "ios" && isLoggedIn && (
        <Button
          label={restoring ? "復元中..." : "購入を復元"}
          variant="ghost"
          loading={restoring}
          onPress={handleRestorePurchases}
        />
      )}
    </View>
  );
}
