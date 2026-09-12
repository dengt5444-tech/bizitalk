import type { ConversationPlan } from "@/lib/entitlements";

// AI conversation practice runs on OpenAI's realtime voice API, which has a
// real, non-trivial per-minute cost (unlike the listening feature, whose
// audio is generated once and cached, then reused for every listener at
// near-zero marginal cost). A full 16-turn realtime session (this app's
// per-session turn cap) costs roughly ¥250-300 in OpenAI usage at
// published gpt-realtime rates ($32/1M audio input tokens, $64/1M audio
// output tokens) — call it ¥280 as a conservative planning figure.
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
//   trial      (¥980):   980 - ¥35 Stripe fee                    = ¥945 budget  -> 2 sessions/mo (¥560, ~41% margin)
//   standard (¥4,990): 4,990 - ¥180 Stripe fee - ¥1,000 referral  = ¥3,810 budget -> 12 sessions/mo (¥3,360, ~12% margin)
//   unlimited(¥9,900): 9,900 - ¥356 Stripe fee - ¥1,000 referral  = ¥8,544 budget -> 28 sessions/mo (¥7,840, ~8% margin;
//                      framed to users as a generous fair-use ceiling, not a headline limit, since the plan is sold as "使い放題")
export const CONVERSATION_SESSIONS_PER_MONTH: Record<ConversationPlan, number> = {
  trial: 2,
  standard: 12,
  unlimited: 28,
};

// Cap applied to logged-in users with no active subscription (trying the
// one free scenario) — same as the trial tier's cap, as a simple anti-abuse
// guard rather than a distinct business rule.
export const FREE_SESSIONS_PER_MONTH = CONVERSATION_SESSIONS_PER_MONTH.trial;

export function sessionsCapFor(plan: ConversationPlan | "admin" | null): number | null {
  if (plan === "admin") return null;
  if (plan === null) return FREE_SESSIONS_PER_MONTH;
  return CONVERSATION_SESSIONS_PER_MONTH[plan];
}
