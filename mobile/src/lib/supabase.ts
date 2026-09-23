import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// The very same Supabase project (and therefore the same auth users) as the
// web app — logging in here with an email address gets exactly the account,
// history and subscription that email has on the website.
//
// Placeholder values only keep createClient from throwing at import time
// when the app was built without configuration; the root layout shows a
// configuration error screen instead of letting any request go out.
export const supabase = createClient(
  SUPABASE_URL ?? "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY ?? "placeholder",
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Supabase recommends tying the token refresh loop to app state on mobile.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
