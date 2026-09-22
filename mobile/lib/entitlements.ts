import { STRIPE_PRICE_ID_STANDARD, STRIPE_PRICE_ID_TRIAL, STRIPE_PRICE_ID_UNLIMITED } from "./env";
import { IAP_PLAN_FOR_PRODUCT_ID } from "./iap";
import { restOne } from "./supabase";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export type ConversationPlan = "trial" | "standard" | "unlimited";

type SubscriptionStatusRow = { status: string };
type SubscriptionRow = { status: string; price_id: string | null; source: string | null; apple_product_id: string | null };

// Mirrors ../src/lib/entitlements.ts, but queried directly against Supabase
// (both tables are owner-SELECT-only under RLS, and the signed-in mobile
// client carries the user's own JWT) instead of through an API route —
// this is a UI convenience only. The actual security boundary is still the
// server: every API route that spends OpenAI/Stripe money re-checks
// entitlement itself with the full ADMIN_EMAILS-aware logic, so a mobile
// client being wrong about its own entitlement can only make the UI show
// (or hide) a lock icon incorrectly, never bypass a paid feature. On any
// query failure, fail closed to "not entitled" rather than throwing —
// callers render this straight into UI state without a catch.
export async function hasActiveConversationSubscription(userId: string) {
  const data = await restOne<SubscriptionStatusRow>(
    "subscriptions",
    "status",
    `user_id=eq.${encodeURIComponent(userId)}`,
  ).catch(() => null);
  return !!data && ACTIVE_STATUSES.has(data.status);
}

// UI-only tier lookup (see file header) — doesn't know about the
// ADMIN_EMAILS allowlist, since that's a server-only env var.
export async function getConversationPlan(userId: string | null | undefined): Promise<ConversationPlan | null> {
  if (!userId) return null;
  const data = await restOne<SubscriptionRow>(
    "subscriptions",
    "status,price_id,source,apple_product_id",
    `user_id=eq.${encodeURIComponent(userId)}`,
  ).catch(() => null);

  if (!data || !ACTIVE_STATUSES.has(data.status)) return null;

  if (data.source === "apple_iap") {
    const plan = IAP_PLAN_FOR_PRODUCT_ID[data.apple_product_id ?? ""];
    return plan === "trial" || plan === "standard" || plan === "unlimited" ? plan : null;
  }

  if (data.price_id === STRIPE_PRICE_ID_TRIAL) return "trial";
  if (data.price_id === STRIPE_PRICE_ID_UNLIMITED) return "unlimited";
  if (data.price_id === STRIPE_PRICE_ID_STANDARD) return "standard";
  return null;
}

// Whether this user can access paid AI conversation scenarios: any active
// subscription tier. (UI-only — see file header.)
export async function isEntitled(userId: string | null | undefined) {
  if (!userId) return false;
  return hasActiveConversationSubscription(userId);
}
