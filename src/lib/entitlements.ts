import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { planForAppleProductId } from "@/lib/apple/config";

// Table-query functions below accept an optional already-resolved Supabase
// client so callers that have one — API routes using getAuthedClient() for
// a mobile bearer-token request, mainly — can pass it through instead of
// this module creating its own cookie-based client, which would carry no
// session on a bearer-token request and get blocked by RLS. Server
// Components never had a client to pass, so they keep omitting it and get
// the same cookie-based lookup as before.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function isAdminEmail(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

// The four AI conversation tiers are separate Stripe prices under one
// product (this app's own `subscriptions` table stores whichever price_id
// the user is subscribed to); the tier name is derived from which price_id
// that is, rather than a separate DB column.
export type ConversationPlan = "trial" | "basic" | "standard" | "unlimited";

function conversationPlanForPriceId(
  priceId: string | null | undefined,
): ConversationPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_TRIAL) return "trial";
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_ID_UNLIMITED) return "unlimited";
  if (priceId === process.env.STRIPE_PRICE_ID) return "standard";
  return null;
}

// A row can come from either payment provider — `source` says which one is
// current, so only that provider's identifier column is trusted. (The
// other column may hold a stale value from before a switch: e.g. a user
// who bought via Stripe on the web, then later subscribed through the iOS
// app, still has their old price_id sitting there untouched, since each
// provider's webhook/sync path only overwrites its own columns.)
async function activeConversationPlanRow(userId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, source, price_id, apple_product_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || !ACTIVE_STATUSES.has(data.status)) return null;
  return data;
}

/**
 * Which AI conversation tier (if any) this user has an active
 * subscription to. Returns "admin" for the ADMIN_EMAILS allowlist (full
 * access, no subscription needed), a tier name for a real paying
 * subscriber (via Stripe or Apple in-app purchase), or null if they have
 * none.
 */
export async function getConversationPlan(
  user: { id: string; email?: string | null } | null | undefined,
  supabase?: SupabaseClient,
): Promise<ConversationPlan | "admin" | null> {
  if (!user) return null;
  if (isAdminEmail(user.email)) return "admin";
  const row = await activeConversationPlanRow(user.id, supabase ?? (await createClient()));
  if (!row) return null;
  if (row.source === "apple_iap") {
    // Never "listening" here — Apple purchases for that plan are routed to
    // gakuto_subscriptions instead, same as Stripe's.
    return planForAppleProductId(row.apple_product_id) as ConversationPlan | null;
  }
  return conversationPlanForPriceId(row.price_id);
}

/**
 * Whether this user can access paid AI conversation scenarios: any active
 * subscription tier (trial/standard/unlimited), or the ADMIN_EMAILS
 * allowlist.
 */
export async function isEntitled(
  user: { id: string; email?: string | null } | null | undefined,
  supabase?: SupabaseClient,
) {
  return (await getConversationPlan(user, supabase)) !== null;
}

