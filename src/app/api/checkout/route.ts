import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";

type Plan = "conversation" | "listening";

function priceIdForPlan(plan: Plan) {
  return plan === "listening"
    ? process.env.STRIPE_PRICE_ID_LISTENING
    : process.env.STRIPE_PRICE_ID;
}

function successPathForPlan(plan: Plan) {
  return plan === "listening" ? "/materials" : "/conversation";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan: Plan = body?.plan === "listening" ? "listening" : "conversation";

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
      metadata: { supabase_user_id: user.id, plan },
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
