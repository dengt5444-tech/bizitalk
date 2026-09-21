import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/stripe";

// Required for App Store review (guideline 5.1.1(v)): an app that lets
// people create an account must also let them delete it, from within the
// app, without contacting support. This tears down everything tied to the
// account — active Stripe subscriptions (so deleting the account also
// stops future billing, not just access), every row across both this
// app's and the shared gakuto/Bijirisu tables keyed by user_id, and
// finally the Supabase auth user itself.
export async function POST() {
  const { user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const stripe = createStripeClient();

  const [{ data: conversationSub }, { data: listeningSub }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("gakuto_subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  for (const subscriptionId of [
    conversationSub?.stripe_subscription_id,
    listeningSub?.stripe_subscription_id,
  ]) {
    if (!subscriptionId) continue;
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (err) {
      // Already-cancelled subscriptions error on a second cancel attempt —
      // never let that block account deletion itself.
      console.error(
        `Failed to cancel Stripe subscription ${subscriptionId} during account deletion:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const deletions = await Promise.allSettled([
    admin.from("saved_words").delete().eq("user_id", user.id),
    admin.from("conversation_sessions").delete().eq("user_id", user.id),
    admin.from("subscriptions").delete().eq("user_id", user.id),
    admin.from("gakuto_saved_words").delete().eq("user_id", user.id),
    admin.from("gakuto_subscriptions").delete().eq("user_id", user.id),
    admin.from("referral_redemptions").delete().eq("user_id", user.id),
  ]);

  for (const result of deletions) {
    if (result.status === "rejected") {
      console.error("Failed to delete a row during account deletion:", result.reason);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
