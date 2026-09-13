import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

// The three AI conversation tiers are separate Stripe prices under one
// product (this app's own `subscriptions` table stores whichever price_id
// the user is subscribed to); the tier name is derived from which price_id
// that is, rather than a separate DB column.
export type ConversationPlan = "trial" | "standard" | "unlimited";

function conversationPlanForPriceId(
  priceId: string | null | undefined,
): ConversationPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_TRIAL) return "trial";
  if (priceId === process.env.STRIPE_PRICE_ID_UNLIMITED) return "unlimited";
  if (priceId === process.env.STRIPE_PRICE_ID) return "standard";
  return null;
}

async function activeConversationPriceId(userId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, price_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || !ACTIVE_STATUSES.has(data.status)) return null;
  return data.price_id as string | null;
}

/**
 * Which AI conversation tier (if any) this user has an active
 * subscription to. Returns "admin" for the ADMIN_EMAILS allowlist (full
 * access, no Stripe subscription needed), a tier name for a real paying
 * subscriber, or null if they have none.
 */
export async function getConversationPlan(
  user: { id: string; email?: string | null } | null | undefined,
  supabase?: SupabaseClient,
): Promise<ConversationPlan | "admin" | null> {
  if (!user) return null;
  if (isAdminEmail(user.email)) return "admin";
  const priceId = await activeConversationPriceId(user.id, supabase ?? (await createClient()));
  return conversationPlanForPriceId(priceId);
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

// The listening (business-listening materials) plan is tracked in the
// shared Supabase project's own gakuto_subscriptions table (the same table
// Bijirisu uses) when bought standalone, but it's also bundled into every
// AI conversation tier (trial/standard/unlimited) — only the pure listening
// plan is a genuinely separate purchase.
export async function hasActiveListeningSubscription(userId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from("gakuto_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data && ACTIVE_STATUSES.has(data.status);
}

export async function isListeningEntitled(
  user: { id: string; email?: string | null } | null | undefined,
  supabase?: SupabaseClient,
) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const client = supabase ?? (await createClient());
  if (await hasActiveListeningSubscription(user.id, client)) return true;
  return (await getConversationPlan(user, client)) !== null;
}
