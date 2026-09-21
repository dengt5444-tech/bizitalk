import {
  APPLE_PRODUCT_ID_LISTENING,
  APPLE_PRODUCT_ID_STANDARD,
  APPLE_PRODUCT_ID_TRIAL,
  APPLE_PRODUCT_ID_UNLIMITED,
} from "./env";
import type { CheckoutPlan } from "./checkout";
import { api } from "./api";

// App Store Connect product id for each plan — same four plans the web app
// sells through Stripe, sold here through StoreKit instead. Only iOS uses
// this; Android keeps the existing Stripe checkout flow (see
// components/pricing/PricingPlans.tsx).
export const IAP_PRODUCT_ID_FOR_PLAN: Record<CheckoutPlan, string | undefined> = {
  listening: APPLE_PRODUCT_ID_LISTENING,
  trial: APPLE_PRODUCT_ID_TRIAL,
  standard: APPLE_PRODUCT_ID_STANDARD,
  unlimited: APPLE_PRODUCT_ID_UNLIMITED,
};

export const IAP_PLAN_FOR_PRODUCT_ID: Record<string, CheckoutPlan> = Object.fromEntries(
  Object.entries(IAP_PRODUCT_ID_FOR_PLAN)
    .filter((entry): entry is [CheckoutPlan, string] => !!entry[1])
    .map(([plan, productId]) => [productId, plan]),
);

export const ALL_IAP_PRODUCT_IDS = Object.values(IAP_PRODUCT_ID_FOR_PLAN).filter(
  (id): id is string => !!id,
);

// Sends StoreKit's signed transaction (Purchase.purchaseToken on iOS — a
// JWS string) to the backend, which independently verifies Apple's
// signature and upserts the subscriptions/gakuto_subscriptions row before
// the app calls finishTransaction. See ../../src/app/api/iap/apple/verify/route.ts.
export function verifyApplePurchase(signedTransactionInfo: string) {
  return api.post<{ ok: true; plan: string }>("/api/iap/apple/verify", {
    signedTransactionInfo,
  });
}
