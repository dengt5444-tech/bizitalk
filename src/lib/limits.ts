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
//   standard (¥4,980): 4,980 - ¥179 Stripe fee - ¥1,000 referral   = ¥3,801 budget -> 200分/月 (¥3,200, ~16% margin)
//   unlimited(¥9,980): 9,980 - ¥359 Stripe fee - ¥1,000 referral   = ¥8,621 budget -> 450分/月 (¥7,200, ~16% margin;
//                      framed to users as a generous fair-use ceiling, not a headline limit, since the plan is sold as "使い放題")
export const CONVERSATION_MINUTES_PER_MONTH: Record<ConversationPlan, number> = {
  trial: 45,
  basic: 100,
  standard: 200,
  unlimited: 450,
};

// A one-time allowance for logged-in users with no active subscription,
// granted at signup rather than renewed every month — enough to complete
// exactly one full roleplay (a negotiation or interview scenario) through
// to its scored feedback, which is the moment the paid plans are pitched.
// Deliberately NOT called *_PER_MONTH: callers must treat this as a
// lifetime cap (see the usage-window handling in
// /api/conversation/sessions/route.ts), not a monthly-resetting one like
// the paid tiers below.
export const FREE_TRIAL_MINUTES = 10;

export function minutesCapFor(plan: ConversationPlan | "admin" | null): number | null {
  if (plan === "admin") return null;
  if (plan === null) return FREE_TRIAL_MINUTES;
  return CONVERSATION_MINUTES_PER_MONTH[plan];
}

// Whether the usage window minutesCapFor's return value applies against is
// a lifetime total (free/no-plan users — FREE_TRIAL_MINUTES never resets)
// or the current calendar month (every paid tier, which renews with their
// subscription).
export function usageWindowIsLifetime(plan: ConversationPlan | "admin" | null): boolean {
  return plan === null;
}

// Safety ceiling on how much duration a single session can contribute to a
// user's monthly total, in case a realtime connection or tab is left open
// far longer than an actual conversation would run — keeps one forgotten
// tab from consuming an outsized chunk (or all) of the month's allowance.
export const MAX_SESSION_DURATION_SECONDS = 30 * 60;
