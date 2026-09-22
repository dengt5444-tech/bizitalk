import { API_BASE_URL } from "./env";
import { auth as supabaseAuth } from "./supabase";

// Generous — some routes (AI reply generation, end-of-session feedback
// scoring) can legitimately take a while — but finite, so a stuck
// connection surfaces as a clear, specific error instead of an
// indefinitely spinning "準備中..." button with nothing to report back.
const REQUEST_TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabaseAuth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

// Every route on the deployed Next.js backend returns JSON, including
// errors (`{ error: string }`), except the audio endpoints (raw
// audio/mpeg bytes) which callers should hit directly with authedAudioUrl
// / authedFetch instead of this helper.
async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const resolvedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth ? await authHeaders() : {}),
    ...(headers as Record<string, string> | undefined),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: resolvedHeaders,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "timeout");
    }
    throw new ApiError(0, "network_error");
  } finally {
    clearTimeout(timer);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) {
      // Session expired or was revoked server-side. Sign out so every
      // screen's existing "please log in" gate (driven by useAuth().user)
      // picks this up automatically instead of the UI silently failing.
      supabaseAuth.signOut().catch(() => {});
    }
    throw new ApiError(response.status, body?.error ?? `http_${response.status}`);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// For <audio>/Sound-style playback URLs (expo-audio), which need the
// Authorization header attached at request time rather than embedded in
// the URL itself (the API route does not accept a token query param).
export async function authedAudioSource(path: string) {
  const headers = await authHeaders();
  return { uri: `${API_BASE_URL}${path}`, headers };
}
