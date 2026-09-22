// These three values are verified correct and stable (confirmed to match
// the live production website's own bundled Supabase project). They are
// still read from EXPO_PUBLIC_* build-time env vars first, as before, but
// now fall back to these known-good values if a build somehow doesn't have
// them injected — an anon key is public/safe to ship in source (same as
// how the website itself embeds it), so this closes off "the build didn't
// get the right env vars" as a way for the app to end up broken.
const FALLBACK_SUPABASE_URL = "https://blhmyhyhiclgvtxiqxpp.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaG15aHloaWNsZ3Z0eGlxeHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Nzc5OTEsImV4cCI6MjEwNDU1Mzk5MX0.-xHJdp2esI78JSEDB9s07Uq84JVmHrnKtKuKDd2zxds";
const FALLBACK_API_BASE_URL = "https://bizitalkapp.com";

function resolve(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

export const SUPABASE_URL = resolve(process.env.EXPO_PUBLIC_SUPABASE_URL, FALLBACK_SUPABASE_URL);
export const SUPABASE_ANON_KEY = resolve(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, FALLBACK_SUPABASE_ANON_KEY);
export const API_BASE_URL = resolve(process.env.EXPO_PUBLIC_API_BASE_URL, FALLBACK_API_BASE_URL).replace(/\/$/, "");

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
