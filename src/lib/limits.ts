import type { ConversationPlan } from "@/lib/entitlements";

// AI conversation practice runs on OpenAI's realtime voice API, which has a
// real, non-trivial per-minute cost (unlike the listening feature, whose
// audio is generated once and cached, then reused for every listener at
// near-zero marginal cost). Published real-world gpt-realtime usage runs
// roughly $0.06-$0.11/minute of talk time; call it $0.10/min (~¥16/min at
// ~¥155/$) as a conservative planning figure.
//
// We cap usage by minutes of conversation per month rather than by session
// count, so a plan reads simply as "talk for up to N minutes a month" and
// usage tracks actual cost far more directly than a fixed per-session turn
// budget did.
//
// Each cap below is sized so the tier stays profitable after Stripe's fee
// (~3.6%) even in the worst case where every subscriber came in through
// the ¥1,000 referral payout — EXCEPT the ¥980 trial tier, where a flat
// ¥1,000 referral payout would exceed the entire plan price and so can't
// apply to it; its cap below assumes no referral cost on that tier.
// Re-check these numbers against real measured usage once there's
// production traffic — they're conservative starting estimates, not
// permanent constants.
//
//   trial      (¥980):   980 - ¥35 Stripe fee                     = ¥945 budget  -> 45分/月  (¥720, ~24% margin)
//   basic    (¥2,980): 2,980 - ¥107 Stripe fee - ¥1,000 referral   = ¥1,873 budget -> 100分/月 (¥1,600, ~15% margin)
//   standard (¥4,990): 4,990 - ¥180 Stripe fee - ¥1,000 referral   = ¥3,810 budget -> 200分/月 (¥3,200, ~16% margin)
//   unlimited(¥9,900): 9,900 - ¥356 Stripe fee - ¥1,000 referral   = ¥8,544 budget -> 450分/月 (¥7,200, ~16% margin;
//                      framed to users as a generous fair-use ceiling, not a headline limit, since the plan is sold as "使い放題")
export const CONVERSATION_MINUTES_PER_MONTH: Record<ConversationPlan, number> = {
  trial: 45,
  basic: 100,
  standard: 200,
  unlimited: 450,
};

// Cap applied to logged-in users with no active subscription (trying the
// one free scenario) — deliberately much smaller than any paid tier, just
// enough to sample the experience before committing to a plan.
export const FREE_MINUTES_PER_MONTH = 5;

export function minutesCapFor(plan: ConversationPlan | "admin" | null): number | null {
  if (plan === "admin") return null;
  if (plan === null) return FREE_MINUTES_PER_MONTH;
  return CONVERSATION_MINUTES_PER_MONTH[plan];
}

// Safety ceiling on how much duration a single session can contribute to a
// user's monthly total, in case a realtime connection or tab is left open
// far longer than an actual conversation would run — keeps one forgotten
// tab from consuming an outsized chunk (or all) of the month's allowance.
export const MAX_SESSION_DURATION_SECONDS = 30 * 60;
