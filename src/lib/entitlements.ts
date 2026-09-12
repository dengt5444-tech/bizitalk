import { createClient } from "@/lib/supabase/server";

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

export async function hasActiveSubscription(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data && ACTIVE_STATUSES.has(data.status);
}

/**
 * Whether this user can access paid scenarios: either a real active
 * subscription, or their email is on the ADMIN_EMAILS allowlist (used to
 * give the site owner full access without going through Stripe).
 */
export async function isEntitled(
  user: { id: string; email?: string | null } | null | undefined,
) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  return hasActiveSubscription(user.id);
}

// The listening (business-listening materials) plan is a separate product
// from the AI conversation plan above, tracked in the shared Supabase
// project's own gakuto_subscriptions table (the same table Bijirisu uses),
// so a subscription to one plan doesn't unlock the other.
export async function hasActiveListeningSubscription(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gakuto_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data && ACTIVE_STATUSES.has(data.status);
}

export async function isListeningEntitled(
  user: { id: string; email?: string | null } | null | undefined,
) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  return hasActiveListeningSubscription(user.id);
}
