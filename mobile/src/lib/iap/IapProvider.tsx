import {
  deepLinkToSubscriptions,
  getAvailablePurchases,
  isUserCancelledError,
  useIAP,
  type Purchase,
} from "expo-iap";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "react-native";
import { api } from "../api";
import { useAuth } from "../auth";
import { APPLE_PRODUCT_IDS } from "../env";
import { usePlan, type ConversationPlan } from "../plan";
import { IapContext, type IapState, type StoreProduct } from "./context";

const PLAN_FOR_PRODUCT = Object.fromEntries(
  (Object.entries(APPLE_PRODUCT_IDS) as [ConversationPlan, string | undefined][])
    .filter((entry): entry is [ConversationPlan, string] => !!entry[1])
    .map(([plan, id]) => [id, plan]),
) as Record<string, ConversationPlan>;

const PRODUCT_IDS = Object.keys(PLAN_FOR_PRODUCT);

// StoreKit (App Store in-app purchase) for the three AI conversation plans.
// Mounted once at the root so a transaction that completes while the user
// is elsewhere in the app (or one left unfinished from a previous launch)
// is still verified and finished.
//
// Every purchase is verified by the web backend (/api/iap/apple/verify),
// which checks Apple's signature on the transaction and that its
// appAccountToken is this user's id before granting the plan — the app
// never grants anything on its own say-so. The transaction is finished only
// after the server has recorded it, so a failed verification is retried on
// the next launch instead of being lost.
export function IapProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { refresh: refreshPlan } = usePlan();
  const [purchasingPlan, setPurchasingPlan] = useState<ConversationPlan | null>(null);
  const [restoring, setRestoring] = useState(false);
  const verifyingRef = useRef(new Set<string>());
  const handlePurchaseRef = useRef<(purchase: Purchase) => Promise<void>>(async () => {});

  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: (purchase) => {
      handlePurchaseRef.current(purchase);
    },
    onPurchaseError: (error) => {
      setPurchasingPlan(null);
      if (isUserCancelledError(error)) return;
      Alert.alert("購入を完了できませんでした", "時間をおいてもう一度お試しください。");
    },
  });

  async function handlePurchase(purchase: Purchase): Promise<boolean> {
    const token = purchase.purchaseToken;
    if (!token || verifyingRef.current.has(purchase.id)) return false;
    verifyingRef.current.add(purchase.id);
    try {
      await api.post("/api/iap/apple/verify", { signedTransactionInfo: token });
      await finishTransaction({ purchase, isConsumable: false });
      await refreshPlan();
      return true;
    } catch {
      // Left unfinished on purpose: StoreKit re-delivers it on the next
      // launch, so the purchase is retried rather than lost.
      return false;
    } finally {
      verifyingRef.current.delete(purchase.id);
    }
  }

  useEffect(() => {
    handlePurchaseRef.current = async (purchase) => {
      const wasPurchasing = purchasingPlan !== null;
      const ok = await handlePurchase(purchase);
      setPurchasingPlan(null);
      if (wasPurchasing) {
        if (ok) {
          Alert.alert("ご登録ありがとうございます", "プランが有効になりました。さっそくAIと話してみましょう。");
        } else {
          Alert.alert(
            "購入の確認に時間がかかっています",
            "お支払いは完了しています。通信環境の良い場所でアプリを開き直すか、「購入を復元」をお試しください。",
          );
        }
      }
    };
  });

  useEffect(() => {
    if (connected && PRODUCT_IDS.length > 0) {
      fetchProducts({ skus: PRODUCT_IDS, type: "subs" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the store connection changes
  }, [connected]);

  const products = useMemo(() => {
    const map: Partial<Record<ConversationPlan, StoreProduct>> = {};
    for (const product of subscriptions) {
      const plan = PLAN_FOR_PRODUCT[product.id];
      if (plan) map[plan] = { plan, productId: product.id, displayPrice: product.displayPrice };
    }
    return map;
  }, [subscriptions]);

  const value: IapState = {
    available: PRODUCT_IDS.length > 0,
    connected,
    products,
    purchasingPlan,
    restoring,
    async purchase(plan) {
      const productId = APPLE_PRODUCT_IDS[plan];
      if (!user || !productId) return;
      setPurchasingPlan(plan);
      try {
        await requestPurchase({
          type: "subs",
          request: { apple: { sku: productId, appAccountToken: user.id } },
        });
      } catch (error) {
        setPurchasingPlan(null);
        if (!isUserCancelledError(error)) {
          Alert.alert("購入を開始できませんでした", "時間をおいてもう一度お試しください。");
        }
      }
    },
    // Re-sends every active subscription this Apple ID owns to the server
    // (e.g. after reinstalling or switching devices). The server only
    // credits a purchase to the account that originally made it.
    async restore() {
      setRestoring(true);
      try {
        const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
        let restored = 0;
        for (const purchase of purchases ?? []) {
          if (PLAN_FOR_PRODUCT[purchase.productId] && (await handlePurchase(purchase))) restored += 1;
        }
        await refreshPlan();
        return restored;
      } finally {
        setRestoring(false);
      }
    },
    async manageSubscriptions() {
      await deepLinkToSubscriptions({}).catch(() => {});
    },
  };

  return <IapContext.Provider value={value}>{children}</IapContext.Provider>;
}
