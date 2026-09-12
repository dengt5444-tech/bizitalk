import { createAdminClient } from "@/lib/supabase/admin";

export type ResolvedReferralCode = {
  code: string;
  label: string;
};

// Codes are admin-issued (see scripts/create-referral-code.mjs) for
// external influencers/partners, not generated per-user — so resolving
// one only ever needs the service-role client, never a user's own session.
export async function resolveReferralCode(
  rawCode: string,
): Promise<ResolvedReferralCode | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("referral_codes")
    .select("code, label")
    .eq("code", code)
    .maybeSingle();

  return data ?? null;
}

export type ReferralCodeSummary = {
  code: string;
  label: string;
  createdAt: string;
  totalRedeemed: number;
  rewarded: number;
};

export async function listReferralCodeSummaries(): Promise<ReferralCodeSummary[]> {
  const admin = createAdminClient();
  const [{ data: codes }, { data: redemptions }] = await Promise.all([
    admin
      .from("referral_codes")
      .select("code, label, created_at")
      .order("created_at", { ascending: false }),
    admin.from("referral_redemptions").select("code, status"),
  ]);

  return (codes ?? []).map((c) => {
    const forCode = (redemptions ?? []).filter((r) => r.code === c.code);
    return {
      code: c.code,
      label: c.label,
      createdAt: c.created_at,
      totalRedeemed: forCode.length,
      rewarded: forCode.filter((r) => r.status === "rewarded").length,
    };
  });
}
