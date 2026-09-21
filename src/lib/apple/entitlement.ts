import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForAppleProductId, tableForPlan } from "./config";

export type AppleEntitlementStatus = "active" | "past_due" | "canceled";

// Shared by both /api/iap/apple/verify (called right after a purchase, from
// the app) and /api/webhooks/apple (Apple's async renewal/refund/expiry
// notifications) — same upsert either way, just triggered differently.
// `appAccountToken` is the Supabase user id we pass to StoreKit ourselves
// when the purchase is initiated (see mobile/lib/iap.ts), so Apple hands it
// straight back on every transaction and notification for that purchase —
// no receipt-to-user lookup needed.
export async function syncAppleEntitlement(
  transaction: JWSTransactionDecodedPayload,
  status: AppleEntitlementStatus,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const userId = transaction.appAccountToken;
  const productId = transaction.productId;
  const originalTransactionId = transaction.originalTransactionId;

  if (!userId) return { ok: false, reason: "missing_app_account_token" };
  if (!productId || !originalTransactionId) return { ok: false, reason: "missing_transaction_fields" };

  const plan = planForAppleProductId(productId);
  if (!plan) return { ok: false, reason: `unknown_product_id:${productId}` };

  const admin = createAdminClient();
  const { error } = await admin.from(tableForPlan(plan)).upsert(
    {
      user_id: userId,
      source: "apple_iap",
      apple_original_transaction_id: originalTransactionId,
      apple_product_id: productId,
      status,
      current_period_end: transaction.expiresDate ? new Date(transaction.expiresDate).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
