import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const REQUEST_TIMEOUT_MS = 15_000;

// A network failure inside the app that isn't a normal HTTP error response
// (DNS/TLS/connectivity failure, or the request timing out) — surfaced with
// a distinct message so it reads differently from "the server said no" and
// is diagnosable without needing to inspect logs on the device.
export class NetworkError extends Error {
  constructor(cause: "timeout" | "offline") {
    super(
      cause === "timeout"
        ? "通信がタイムアウトしました。電波の良い場所でもう一度お試しください。"
        : "サーバーに接続できませんでした。通信環境をご確認ください。",
    );
    this.name = "NetworkError";
  }
}

// Every request in this file goes through this: a fixed timeout (so a
// hung connection fails visibly instead of spinning forever) and a single
// place that turns "fetch threw" into a message that distinguishes a
// timeout from no connectivity at all, instead of both looking identical.
async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new NetworkError("timeout");
    throw new NetworkError("offline");
  } finally {
    clearTimeout(timer);
  }
}

// This used to go through the @supabase/supabase-js client. That library's
// behavior on this device could not be reproduced outside the app (the
// exact same requests succeeded via curl and via the same library version
// running in Node), so it's replaced here with plain fetch() calls against
// Supabase's own REST (PostgREST) and Auth (GoTrue) HTTP APIs — the same
// APIs the client library itself calls under the hood, verified directly
// against the production project this app talks to. This removes the
// client library as a variable entirely.

export type AuthUser = { id: string; email: string | null };
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  user: AuthUser;
};

const SESSION_KEY = "sb-session";

type Listener = (session: AuthSession | null) => void;
const listeners = new Set<Listener>();
let currentSession: AuthSession | null = null;
let initPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener(currentSession));
}

async function persist(session: AuthSession | null) {
  currentSession = session;
  try {
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage failing shouldn't crash auth — the session just won't
    // survive an app restart.
  }
  notify();
}

function toSession(json: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user: { id: string; email?: string | null };
}): AuthSession {
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
    user: { id: json.user.id, email: json.user.email ?? null },
  };
}

async function authRequest(path: string, body: unknown) {
  const response = await timedFetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (json && (json.error_description || json.msg || json.error || json.message)) ||
      `auth_${response.status}`;
    throw new Error(message);
  }
  return json;
}

async function refreshSession(refreshToken: string) {
  const json = await authRequest("/token?grant_type=refresh_token", { refresh_token: refreshToken });
  await persist(toSession(json));
}

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as AuthSession;
        if (parsed.expires_at * 1000 < Date.now() + 60_000) {
          await refreshSession(parsed.refresh_token).catch(() => persist(null));
        } else {
          currentSession = parsed;
        }
      } catch {
        // Unparseable/corrupt session from a previous build — drop it
        // rather than let it permanently break every authed request.
        await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      }
    })();
  }
  return initPromise;
}

// Returns a valid (non-expired) access token, refreshing first if needed.
// Null means "no session" — callers fall back to the anon key.
export async function getAccessToken(): Promise<string | null> {
  await ensureInitialized();
  if (!currentSession) return null;
  if (currentSession.expires_at * 1000 < Date.now() + 60_000) {
    try {
      await refreshSession(currentSession.refresh_token);
    } catch {
      await persist(null);
      return null;
    }
  }
  return currentSession?.access_token ?? null;
}

export const auth = {
  async getSession(): Promise<{ data: { session: AuthSession | null } }> {
    await getAccessToken();
    return { data: { session: currentSession } };
  },
  onAuthStateChange(callback: Listener) {
    listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(callback);
          },
        },
      },
    };
  },
  async signInWithOtp({ email }: { email: string; options?: { shouldCreateUser?: boolean } }) {
    try {
      await authRequest("/otp", { email, create_user: true });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
  async verifyOtp({ email, token, type }: { email: string; token: string; type: "email" }) {
    try {
      const json = await authRequest("/verify", { email, token, type });
      const session = toSession(json);
      await persist(session);
      return { data: { session }, error: null };
    } catch (err) {
      return { data: { session: null }, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
  async signOut() {
    await persist(null);
  },
};

// --- REST (PostgREST) helpers for read-only table queries ------------------

async function restHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
  };
}

async function parseRestError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null);
  const detail = body && (body.message || body.error);
  return new Error(`サーバーとの通信に失敗しました(エラーコード: ${response.status}${detail ? ` / ${detail}` : ""})`);
}

// Mirrors supabase-js's `.from(table).select(select)...` for a list result.
// `query` is a raw PostgREST query string fragment, e.g.
// `order=order_index.asc` or `slug=eq.foo&order=created_at.desc`.
export async function restList<T>(table: string, select: string, query?: string): Promise<T[]> {
  const params = new URLSearchParams({ select });
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}${query ? `&${query}` : ""}`;
  const response = await timedFetch(url, { headers: await restHeaders() });
  if (!response.ok) throw await parseRestError(response);
  return (await response.json()) as T[];
}

// Mirrors `.select(select).eq(...).maybeSingle()` — returns the first row
// or null, without PostgREST's single-object content negotiation.
export async function restOne<T>(table: string, select: string, query: string): Promise<T | null> {
  const rows = await restList<T>(table, select, `${query}&limit=1`);
  return rows[0] ?? null;
}

// Mirrors `.select("*", { count: "exact", head: true })`.
export async function restCount(table: string, query?: string): Promise<number> {
  const params = new URLSearchParams({ select: "id" });
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}${query ? `&${query}` : ""}`;
  const response = await timedFetch(url, {
    method: "HEAD",
    headers: { ...(await restHeaders()), Prefer: "count=exact" },
  });
  if (!response.ok) throw await parseRestError(response);
  const range = response.headers.get("content-range");
  const total = range?.split("/")[1];
  return total ? parseInt(total, 10) : 0;
}
