function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy mobile/.env.example to mobile/.env and fill it in.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "EXPO_PUBLIC_SUPABASE_URL",
  process.env.EXPO_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = required(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const API_BASE_URL = required(
  "EXPO_PUBLIC_API_BASE_URL",
  process.env.EXPO_PUBLIC_API_BASE_URL,
).replace(/\/$/, "");

// Stripe Price IDs aren't secret (they're routinely exposed to clients in
// Stripe.js integrations) — only used here to tell which AI conversation
// tier a subscription's price_id corresponds to, for "current plan"
// highlighting on the pricing screen. Optional: if unset, that
// highlighting just can't tell tiers apart (hasActiveConversationSubscription
// still works for unlock checks).
export const STRIPE_PRICE_ID_TRIAL = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_TRIAL;
export const STRIPE_PRICE_ID_STANDARD = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
export const STRIPE_PRICE_ID_UNLIMITED = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_UNLIMITED;

// App Store Connect product identifiers (not secret — these are the exact
// strings shown to App Store users in the system purchase sheet). One per
// plan, same four plans as the Stripe prices above. Required for the iOS
// purchase flow (components/pricing/PricingPlans.tsx); harmless to leave
// unset on Android, which still uses Stripe checkout.
export const APPLE_PRODUCT_ID_LISTENING = process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID_LISTENING;
export const APPLE_PRODUCT_ID_TRIAL = process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID_TRIAL;
export const APPLE_PRODUCT_ID_STANDARD = process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID;
export const APPLE_PRODUCT_ID_UNLIMITED = process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID_UNLIMITED;
