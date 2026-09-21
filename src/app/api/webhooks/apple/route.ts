import { NextResponse } from "next/server";
import { Status } from "@apple/app-store-server-library";
import { verifyAndDecodeAppleNotification, verifyAndDecodeAppleTransaction } from "@/lib/apple/verifier";
import { syncAppleEntitlement, type AppleEntitlementStatus } from "@/lib/apple/entitlement";

// App Store Server Notifications V2: Apple calls this whenever a
// subscription it manages changes state (renewal, expiry, refund, billing
// retry/grace period, ...) — the equivalent of the Stripe webhook, but for
// purchases made through the iOS app. This is what keeps entitlement in
// sync for users who never reopen the app around the renewal date.
function statusFromAppleStatus(status: Status | number | undefined): AppleEntitlementStatus {
  switch (status) {
    case Status.ACTIVE:
    case Status.BILLING_GRACE_PERIOD:
      return "active";
    case Status.BILLING_RETRY:
      return "past_due";
    case Status.EXPIRED:
    case Status.REVOKED:
    default:
      return "canceled";
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const signedPayload = body?.signedPayload;

  if (typeof signedPayload !== "string" || !signedPayload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let notification;
  try {
    notification = await verifyAndDecodeAppleNotification(signedPayload);
  } catch (err) {
    console.error("Apple notification verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Apple's "Request a Test Notification" tool in App Store Connect, and a
  // handful of other notification types, carry no transaction to sync —
  // just acknowledge those.
  const signedTransactionInfo = notification.data?.signedTransactionInfo;
  if (!signedTransactionInfo) {
    return NextResponse.json({ received: true });
  }

  let transaction;
  try {
    transaction = await verifyAndDecodeAppleTransaction(signedTransactionInfo);
  } catch (err) {
    console.error("Apple notification transaction verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const status = statusFromAppleStatus(notification.data?.status);
  const result = await syncAppleEntitlement(transaction, status);

  if (!result.ok) {
    // Unrecognized product id, missing appAccountToken on a very old
    // pre-this-feature transaction, etc. — log for visibility, but don't
    // make Apple retry a notification we'll never be able to act on.
    console.error("Apple webhook: could not sync entitlement:", result.reason);
  }

  return NextResponse.json({ received: true });
}
