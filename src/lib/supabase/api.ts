import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createClient as createCookieClient } from "./server";

// API routes are called two ways: from the web app (Supabase session cookie,
// refreshed by middleware) and from the mobile app (no cookies — it sends
// `Authorization: Bearer <supabase access token>` instead, since there's no
// browser to hold a cookie jar shared with Supabase). This resolves whichever
// one is present so route handlers don't need to care which client called
// them. Cookie behavior is unchanged when no bearer token is sent.
export async function getAuthedClient() {
  const headerList = await headers();
  const bearerToken = headerList
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    return { supabase, user };
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
