import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// react-native-url-polyfill/auto used to be required here, but it
// unconditionally replaces the engine's own URL/URLSearchParams with an
// older JS implementation. The current Hermes runtime already implements
// both natively, and the polyfill silently mis-parsing request URLs (e.g.
// dropping/mangling query strings or headers built from a URL) is a known
// source of requests failing in the app while the exact same request
// works fine everywhere else (curl, Node). Only fall back to it if this
// engine genuinely lacks URL support.
if (typeof globalThis.URL === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional load, can't be a static import
  require("react-native-url-polyfill/auto");
}

// If a previous broken build ever persisted a malformed session, a client
// that fails to parse it on startup can end up in a permanently broken
// state for every request, not just auth. Wipe anything unparseable before
// creating the client so a bad local cache can't masquerade as a server
// or credentials problem.
const SESSION_STORAGE_PREFIX = "sb-";
AsyncStorage.getAllKeys()
  .then((keys) => keys.filter((k) => k.startsWith(SESSION_STORAGE_PREFIX)))
  .then((keys) =>
    Promise.all(
      keys.map(async (key) => {
        const value = await AsyncStorage.getItem(key);
        if (!value) return;
        try {
          JSON.parse(value);
        } catch {
          await AsyncStorage.removeItem(key);
        }
      }),
    ),
  )
  .catch(() => {});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection on native — login uses the 6-digit
    // OTP code flow (verifyOtp), not a magic-link redirect.
    detectSessionInUrl: false,
  },
  global: {
    // Bind explicitly to the environment's fetch instead of letting the
    // library resolve `fetch` lazily — removes any ambiguity if something
    // else in the RN runtime patches the global after this module loads.
    fetch,
  },
});
