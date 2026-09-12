// Admin utility: create (or relabel) an influencer referral code.
// Usage: node scripts/create-referral-code.mjs <CODE> <label>
// Example: node scripts/create-referral-code.mjs YUKI2026 "Yuki (YouTube)"
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const [, , rawCode, ...labelParts] = process.argv;
const label = labelParts.join(" ").trim();

if (!rawCode || !label) {
  console.error("Usage: node scripts/create-referral-code.mjs <CODE> <label>");
  console.error('Example: node scripts/create-referral-code.mjs YUKI2026 "Yuki (YouTube)"');
  process.exit(1);
}

const code = rawCode.trim().toUpperCase();

const { error } = await supabase
  .from("referral_codes")
  .upsert({ code, label }, { onConflict: "code" });

if (error) {
  console.error(`Failed to create referral code "${code}":`, error.message);
  process.exit(1);
}

console.log(`Created referral code "${code}" for "${label}".`);
console.log(`Share link: <your-site-url>/pricing?ref=${code}`);
