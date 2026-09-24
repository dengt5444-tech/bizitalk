// Product-id <-> plan mapping, mirroring how lib/entitlements.ts maps
// Stripe price IDs to plans — same five plans, just identified by App
// Store Connect product identifiers instead of Stripe price IDs.
export type IapPlan = "listening" | "trial" | "basic" | "standard" | "unlimited";

export function appleProductIdForPlan(plan: IapPlan): string | undefined {
  switch (plan) {
    case "listening":
      return process.env.APPLE_PRODUCT_ID_LISTENING;
    case "trial":
      return process.env.APPLE_PRODUCT_ID_TRIAL;
    case "basic":
      return process.env.APPLE_PRODUCT_ID_BASIC;
    case "standard":
      return process.env.APPLE_PRODUCT_ID;
    case "unlimited":
      return process.env.APPLE_PRODUCT_ID_UNLIMITED;
  }
}

export function planForAppleProductId(productId: string | null | undefined): IapPlan | null {
  if (!productId) return null;
  if (productId === process.env.APPLE_PRODUCT_ID_LISTENING) return "listening";
  if (productId === process.env.APPLE_PRODUCT_ID_TRIAL) return "trial";
  if (productId === process.env.APPLE_PRODUCT_ID_BASIC) return "basic";
  if (productId === process.env.APPLE_PRODUCT_ID) return "standard";
  if (productId === process.env.APPLE_PRODUCT_ID_UNLIMITED) return "unlimited";
  return null;
}

// Same table-routing rule the Stripe webhook uses: the listening plan is
// its own product in the shared gakuto_subscriptions table; the three AI
// conversation tiers all live in this app's own subscriptions table.
export function tableForPlan(plan: IapPlan): "subscriptions" | "gakuto_subscriptions" {
  return plan === "listening" ? "gakuto_subscriptions" : "subscriptions";
}

export function appleBundleId(): string {
  return process.env.APPLE_BUNDLE_ID ?? "com.bizitalk.app";
}

export function appleAppAppleId(): number | undefined {
  const raw = process.env.APPLE_APP_APPLE_ID;
  return raw ? Number(raw) : undefined;
}
