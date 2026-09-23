import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { getConversationPlan } from "@/lib/entitlements";

// Lets the mobile app show which plan the signed-in user is on, resolved by
// exactly the same rules the web pages use (getConversationPlan: Stripe
// price IDs, Apple product IDs and the ADMIN_EMAILS allowlist) instead of
// duplicating that mapping in the app. `source` tells the app where the
// subscription is managed — the App Store, or the website (Stripe).
export async function GET() {
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = await getConversationPlan(user, supabase);
  let source: "stripe" | "apple_iap" | null = null;

  if (plan && plan !== "admin") {
    const { data } = await supabase
      .from("subscriptions")
      .select("source")
      .eq("user_id", user.id)
      .maybeSingle();
    source = data?.source === "apple_iap" ? "apple_iap" : "stripe";
  }

  return NextResponse.json({ plan, source });
}
