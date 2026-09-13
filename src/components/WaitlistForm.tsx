"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setStatus("error");
      setErrorMessage(body?.error ?? "登録に失敗しました。もう一度お試しください。");
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-signal/30 bg-signal-tint p-6 text-center">
        <p className="font-display font-semibold text-signal-dim">
          登録ありがとうございます!
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          抽選結果、または正式リリースの優先案内を、このメールアドレスにお送りします。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-signal"
      />

      {status === "error" && <p className="text-sm text-rose">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-signal px-6 py-3.5 text-base font-medium text-paper transition hover:bg-signal-dim disabled:opacity-50"
      >
        {status === "sending" ? "送信中..." : "無料モニターに応募する"}
      </button>
    </form>
  );
}
