import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function periodEnd(subscription: Stripe.Subscription): string | null {
  const timestamp =
    subscription.items.data[0]?.current_period_end ??
    (subscription as unknown as { current_period_end?: number })
      .current_period_end;

  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

// The listening plan and the AI conversation plan are separate Stripe
// products with separate entitlement tables — the listening plan reuses
// the shared Supabase project's own gakuto_subscriptions table (the same
// one Bijirisu uses), so a subscription to one plan doesn't unlock the
// other. Which table a given subscription belongs to is recorded in the
// subscription's own metadata (set at checkout creation time).
function tableForPlan(plan: string | undefined) {
  return plan === "listening" ? "gakuto_subscriptions" : "subscriptions";
}

async function upsertFromSubscription(
  subscription: Stripe.Subscription,
  userId: string | undefined,
) {
  if (!userId) return;

  const admin = createAdminClient();
  await admin.from(tableForPlan(subscription.metadata?.plan)).upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      price_id: subscription.items.data[0]?.price.id,
      status: subscription.status,
      current_period_end: periodEnd(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 500 },
    );
  }

  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? undefined;
      if (userId && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        await upsertFromSubscription(subscription, userId);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      await upsertFromSubscription(subscription, userId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
