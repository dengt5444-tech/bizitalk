"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const callbackReason = searchParams.get("reason");
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // If this browser already has a signed-in session, requesting a login for
  // a DIFFERENT email must not silently leave the old session active behind
  // it — otherwise a still-valid old session can make it look like the new
  // email "didn't work" and the site just kept showing the old account.
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setLoggedInEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();

    // Switching to a different account in the same browser: sign out of
    // the old session first so it can't linger and get mistaken for the
    // new one after verification.
    if (loggedInEmail && loggedInEmail.toLowerCase() !== email.trim().toLowerCase()) {
      await supabase.auth.signOut();
      setLoggedInEmail(null);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setVerifyError("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setVerifyError(error.message);
      setVerifying(false);
      return;
    }

    // Safety net: the resulting session should always be for the email
    // just verified. If it's ever anything else, sign out rather than
    // silently continuing into a mismatched account.
    const resultEmail = data.user?.email?.toLowerCase();
    if (resultEmail && resultEmail !== email.trim().toLowerCase()) {
      await supabase.auth.signOut();
      setVerifyError(
        "認証したメールアドレスが一致しませんでした。お手数ですがもう一度お試しください。",
      );
      setVerifying(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-line bg-surface p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          ログイン
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          メールアドレスを入力すると、ログイン用リンクをお送りします。
        </p>

        {loggedInEmail && status === "idle" && (
          <div className="mt-4 rounded-xl border border-line bg-paper-dim p-4 text-sm text-ink-soft">
            現在 <span className="font-medium text-ink">{loggedInEmail}</span>{" "}
            としてログイン中です。別のメールアドレスを入力すると、現在のセッションからログアウトしてから切り替えます。
          </div>
        )}

        {callbackError && (
          <div className="mt-4 rounded-xl border border-rose/30 bg-rose-tint p-4 text-sm text-rose">
            <p className="font-semibold">ログインリンクの確認に失敗しました。</p>
            <p className="mt-1">
              リンクが無効になった場合は、下のフォームからもう一度メールを送信し、メール内の6桁のコードを入力してログインすることもできます。
            </p>
            {callbackReason && (
              <p className="mt-2 text-xs break-all opacity-80">
                詳細: {callbackReason}
              </p>
            )}
          </div>
        )}

        {status === "sent" ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-signal/30 bg-signal-tint p-4 text-sm text-signal-dim">
              {email} 宛にメールを送信しました。メール内のリンクをクリックするか、メールに記載された6桁のコードを下に入力してください。
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-ink"
                >
                  6桁のコード
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-lg tracking-widest text-ink outline-none focus:border-signal"
                />
              </div>

              {verifyError && (
                <p className="text-sm text-rose">
                  コードが正しくないか、期限切れです。{verifyError}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying || code.trim().length === 0}
                className="w-full rounded-full bg-signal px-4 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim disabled:opacity-50"
              >
                {verifying ? "確認中..." : "コードでログイン"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="w-full text-center text-sm text-ink-soft transition hover:text-signal"
            >
              別のメールアドレスで送り直す
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-ink"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-signal"
                placeholder="you@example.com"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-rose">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-full bg-signal px-4 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim disabled:opacity-50"
            >
              {status === "sending" ? "送信中..." : "ログインリンクを送信"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
