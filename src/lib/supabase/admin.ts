import { createClient } from "@supabase/supabase-js";

// Service-role client for trusted server-side code only (API routes,
// webhooks). Bypasses Row Level Security — never import this from
// client components or expose it to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
