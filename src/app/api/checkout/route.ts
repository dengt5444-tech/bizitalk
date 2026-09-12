import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";

// Four Stripe prices under two entitlement tables: the standalone
// "listening" plan writes to gakuto_subscriptions (shared with Bijirisu),
// while the three AI conversation tiers (trial/standard/unlimited) all
// write to this app's own subscriptions table — the specific tier is
// recovered later from which price_id ended up stored there (see
// lib/entitlements.ts), so checkout only needs to tag the coarse table
// destination in metadata, not the tier itself.
type CheckoutPlan = "listening" | "trial" | "standard" | "unlimited";

function priceIdForPlan(plan: CheckoutPlan) {
  switch (plan) {
    case "listening":
      return process.env.STRIPE_PRICE_ID_LISTENING;
    case "trial":
      return process.env.STRIPE_PRICE_ID_TRIAL;
    case "unlimited":
      return process.env.STRIPE_PRICE_ID_UNLIMITED;
    case "standard":
    default:
      return process.env.STRIPE_PRICE_ID;
  }
}

function entitlementTableTag(plan: CheckoutPlan): "listening" | "conversation" {
  return plan === "listening" ? "listening" : "conversation";
}

function successPathForPlan(plan: CheckoutPlan) {
  return plan === "listening" ? "/materials" : "/conversation";
}

const VALID_PLANS: CheckoutPlan[] = ["listening", "trial", "standard", "unlimited"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan: CheckoutPlan = VALID_PLANS.includes(body?.plan) ? body.plan : "standard";

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "price_not_configured" },
      { status: 500 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const stripe = createStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan: entitlementTableTag(plan) },
    },
    success_url: `${siteUrl}${successPathForPlan(plan)}?checkout=success`,
    cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "checkout_session_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
