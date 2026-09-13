import { STRIPE_PRICE_ID_STANDARD, STRIPE_PRICE_ID_TRIAL, STRIPE_PRICE_ID_UNLIMITED } from "./env";
import { supabase } from "./supabase";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export type ConversationPlan = "trial" | "standard" | "unlimited";

// Mirrors ../src/lib/entitlements.ts, but queried directly against Supabase
// (both tables are owner-SELECT-only under RLS, and the signed-in mobile
// client carries the user's own JWT) instead of through an API route —
// this is a UI convenience only. The actual security boundary is still the
// server: every API route that spends OpenAI/Stripe money re-checks
// entitlement itself with the full ADMIN_EMAILS-aware logic, so a mobile
// client being wrong about its own entitlement can only make the UI show
// (or hide) a lock icon incorrectly, never bypass a paid feature.
export async function hasActiveListeningSubscription(userId: string) {
  const { data } = await supabase
    .from("gakuto_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data && ACTIVE_STATUSES.has(data.status);
}

export async function hasActiveConversationSubscription(userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data && ACTIVE_STATUSES.has(data.status);
}

// UI-only tier lookup (see file header) — doesn't know about the
// ADMIN_EMAILS allowlist, since that's a server-only env var.
export async function getConversationPlan(userId: string | null | undefined): Promise<ConversationPlan | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("subscriptions")
    .select("status, price_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || !ACTIVE_STATUSES.has(data.status)) return null;
  if (data.price_id === STRIPE_PRICE_ID_TRIAL) return "trial";
  if (data.price_id === STRIPE_PRICE_ID_UNLIMITED) return "unlimited";
  if (data.price_id === STRIPE_PRICE_ID_STANDARD) return "standard";
  return null;
}

export async function isListeningEntitled(userId: string | null | undefined) {
  if (!userId) return false;
  if (await hasActiveListeningSubscription(userId)) return true;
  return hasActiveConversationSubscription(userId);
}

// Whether this user can access paid AI conversation scenarios: any active
// subscription tier. (UI-only — see file header.)
export async function isEntitled(userId: string | null | undefined) {
  if (!userId) return false;
  return hasActiveConversationSubscription(userId);
}
