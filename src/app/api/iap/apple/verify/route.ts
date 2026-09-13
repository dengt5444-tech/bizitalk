import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { verifyAndDecodeAppleTransaction } from "@/lib/apple/verifier";
import { syncAppleEntitlement } from "@/lib/apple/entitlement";
import { planForAppleProductId } from "@/lib/apple/config";

// Called by the mobile app right after StoreKit reports a successful
// purchase (see mobile/lib/iap.ts). The client sends the raw JWS
// transaction string StoreKit gave it (`purchase.purchaseToken` on iOS) —
// we independently verify Apple's signature on it rather than trusting
// anything the client claims about the purchase.
export async function POST(request: Request) {
  const { user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const signedTransactionInfo = body?.signedTransactionInfo;

  if (typeof signedTransactionInfo !== "string" || !signedTransactionInfo) {
    return NextResponse.json({ error: "invalid_transaction" }, { status: 400 });
  }

  let transaction;
  try {
    transaction = await verifyAndDecodeAppleTransaction(signedTransactionInfo);
  } catch (err) {
    console.error("Apple transaction verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "verification_failed" }, { status: 400 });
  }

  // The app sets appAccountToken to the purchaser's own Supabase user id
  // when it starts the purchase (StoreKit hands it back on every
  // transaction for that subscription). If it doesn't match whoever is
  // actually calling this endpoint, don't credit the entitlement to them —
  // legitimate purchases from this app always match.
  if (transaction.appAccountToken !== user.id) {
    return NextResponse.json({ error: "account_mismatch" }, { status: 403 });
  }

  const plan = planForAppleProductId(transaction.productId);
  if (!plan) {
    console.error(`Apple purchase verify: unrecognized product id "${transaction.productId}".`);
    return NextResponse.json({ error: "unknown_product" }, { status: 400 });
  }

  const status = transaction.revocationDate ? "canceled" : "active";
  const result = await syncAppleEntitlement(transaction, status);

  if (!result.ok) {
    console.error("Failed to sync Apple entitlement:", result.reason);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan });
}
