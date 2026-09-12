import { createAdminClient } from "@/lib/supabase/admin";

// Unambiguous uppercase alphanumeric charset (no 0/O or 1/I) so a code
// read aloud or copied by hand is hard to mistype.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.code;

  // Extremely unlikely to collide at 8 chars from a 33-symbol alphabet,
  // but retry a few times against the unique constraint just in case.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await admin
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .single();

    if (!error && data) return data.code;
  }

  throw new Error("failed to generate a unique referral code");
}

export type ResolvedReferral = {
  referrerUserId: string;
  code: string;
};

export async function resolveReferralCode(
  rawCode: string,
  currentUserId: string,
): Promise<ResolvedReferral | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (!data || data.user_id === currentUserId) return null;
  return { referrerUserId: data.user_id, code };
}

export type ReferralStats = {
  totalReferred: number;
  rewarded: number;
};

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("referrals")
    .select("status")
    .eq("referrer_user_id", userId);

  const rows = data ?? [];
  return {
    totalReferred: rows.length,
    rewarded: rows.filter((r) => r.status === "rewarded").length,
  };
}
