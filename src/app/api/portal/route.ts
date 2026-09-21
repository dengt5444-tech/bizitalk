import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { createStripeClient } from "@/lib/stripe";

const MOBILE_RETURN_URL = "bizitalk://portal-return";

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const table = body?.plan === "listening" ? "gakuto_subscriptions" : "subscriptions";

  const { data: subscription } = await supabase
    .from(table)
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const stripe = createStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: body?.mobileReturn === true ? MOBILE_RETURN_URL : `${siteUrl}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
