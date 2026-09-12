import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // A failed magic-link exchange (e.g. opened on a different device/
    // browser than the one that requested it, so the PKCE verifier cookie
    // doesn't match) must never leave whatever session was already active
    // in this browser looking like a successful login — sign it out so the
    // failure is unambiguous instead of silently falling back to a
    // previously logged-in account.
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=auth&reason=${encodeURIComponent(error.message)}`,
    );
  }

  const searchParamsError = searchParams.get("error_description");
  return NextResponse.redirect(
    `${origin}/login?error=auth${
      searchParamsError ? `&reason=${encodeURIComponent(searchParamsError)}` : ""
    }`,
  );
}
