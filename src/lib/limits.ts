// AI conversation practice runs on OpenAI's realtime voice API, which has
// a real, non-trivial per-minute cost (unlike the listening feature, whose
// audio is generated once and cached, then reused for every listener at
// near-zero marginal cost). This cap keeps the discounted ¥2,980/month
// conversation plan profitable even in the worst case where every
// subscriber came in through the ¥1,000 referral payout:
//
//   revenue                         ¥2,980
//   - Stripe fee (~3.6%)            -¥107
//   - referral payout (worst case)  -¥1,000
//   = budget for OpenAI cost         ¥1,873 / month
//
// A full 16-turn realtime session (this app's per-session turn cap) costs
// roughly ¥250-300 in OpenAI usage at published gpt-realtime rates, so 6
// sessions/month (~¥1,680-1,800) stays safely under that budget with
// margin to spare. Re-check this number against real measured usage once
// there's production traffic — it's a conservative starting estimate, not
// a permanent constant.
export const MAX_CONVERSATION_SESSIONS_PER_MONTH = 6;
