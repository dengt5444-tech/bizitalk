import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthedClient } from "@/lib/supabase/api";
import { createStripeClient } from "@/lib/stripe";
import { resolveReferralCode } from "@/lib/referrals";

// The mobile app has no page to redirect back to, so it asks for this
// custom-scheme URL instead of a site path; expo-web-browser's auth
// session watches for it and closes the in-app browser once Stripe
// redirects here.
const MOBILE_RETURN_SCHEME = "bizitalk://checkout";

// Five Stripe prices under two entitlement tables: the standalone
// "listening" plan writes to gakuto_subscriptions (shared with Bijirisu),
// while the four AI conversation tiers (trial/basic/standard/unlimited)
// all write to this app's own subscriptions table — the specific tier is
// recovered later from which price_id ended up stored there (see
// lib/entitlements.ts), so checkout only needs to tag the coarse table
// destination in metadata, not the tier itself.
type CheckoutPlan = "listening" | "trial" | "basic" | "standard" | "unlimited";

const PRICE_ENV_VAR_FOR_PLAN: Record<CheckoutPlan, string> = {
  listening: "STRIPE_PRICE_ID_LISTENING",
  trial: "STRIPE_PRICE_ID_TRIAL",
  basic: "STRIPE_PRICE_ID_BASIC",
  standard: "STRIPE_PRICE_ID",
  unlimited: "STRIPE_PRICE_ID_UNLIMITED",
};

function priceIdForPlan(plan: CheckoutPlan) {
  return process.env[PRICE_ENV_VAR_FOR_PLAN[plan]];
}

function entitlementTableTag(plan: CheckoutPlan): "listening" | "conversation" {
  return plan === "listening" ? "listening" : "conversation";
}

function successPathForPlan(plan: CheckoutPlan) {
  return plan === "listening" ? "/materials" : "/conversation";
}

const VALID_PLANS: CheckoutPlan[] = ["listening", "trial", "basic", "standard", "unlimited"];

export async function POST(request: Request) {
  const { user } = await getAuthedClient();

  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan: CheckoutPlan = VALID_PLANS.includes(body?.plan) ? body.plan : "standard";

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    // Logged server-side (visible in Vercel function logs) so a missing
    // price ID for one specific plan is easy to spot — this env var is
    // set separately per Vercel environment (Production/Preview/Development)
    // and requires a new deployment to take effect after being added.
    const message = `Checkout misconfigured for plan "${plan}": env var ${PRICE_ENV_VAR_FOR_PLAN[plan]} is not set.`;
    console.error(message);
    Sentry.captureMessage(message, "error");
    return NextResponse.json(
      {
        error:
          "このプランは現在準備中です。しばらくしてからもう一度お試しいただくか、他のプランをご確認ください。",
      },
      { status: 500 },
    );
  }

  const rawReferralCode = typeof body?.referralCode === "string" ? body.referralCode : "";
  // Best-effort: an unrecognized code, or even a referrals-table hiccup,
  // should never block checkout itself.
  const referral = rawReferralCode
    ? await resolveReferralCode(rawReferralCode).catch((err) => {
        console.error("Failed to resolve referral code:", err instanceof Error ? err.message : err);
        return null;
      })
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const stripe = createStripeClient();
  const fromMobile = body?.mobileReturn === true;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: entitlementTableTag(plan),
          ...(referral ? { referral_code: referral.code } : {}),
        },
      },
      success_url: fromMobile
        ? `${MOBILE_RETURN_SCHEME}?status=success`
        : `${siteUrl}${successPathForPlan(plan)}?checkout=success`,
      cancel_url: fromMobile
        ? `${MOBILE_RETURN_SCHEME}?status=cancelled`
        : `${siteUrl}/pricing?checkout=cancelled`,
    });
  } catch (err) {
    // Surfaced fully in server logs (e.g. a price ID from the wrong Stripe
    // mode, or belonging to an archived product) rather than as a generic
    // Next.js error page, since this previously failed silently for the
    // caller with no way to tell which plan or why.
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`Checkout session creation failed for plan "${plan}":`, message);
    Sentry.captureException(err, { tags: { plan } });
    return NextResponse.json(
      { error: "決済ページの作成に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }

  if (!session.url) {
    return NextResponse.json(
      { error: "決済ページの作成に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
