"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tag } from "lucide-react";

export const REFERRAL_CODE_STORAGE_KEY = "biztalk_referral_code";

function readInitialCode(refFromUrl: string | null): string {
  if (refFromUrl) return refFromUrl.trim().toUpperCase();
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REFERRAL_CODE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function ReferralCodeField() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(() => readInitialCode(searchParams.get("ref")));

  // Persist whenever the code changes (typed by hand, or seeded from the
  // ?ref= URL param above) so it survives to the actual checkout click.
  useEffect(() => {
    try {
      if (code) {
        localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, code);
      } else {
        localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
      }
    } catch {
      // Private browsing / blocked storage: the field still works for this
      // checkout, it just won't be remembered next visit.
    }
  }, [code]);

  return (
    <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-line bg-paper-dim p-4">
      <label
        htmlFor="referral-code"
        className="flex items-center justify-center gap-1.5 text-sm font-semibold text-ink"
      >
        <Tag size={15} strokeWidth={2} className="text-signal" />
        紹介コードをお持ちですか?
      </label>
      <p className="mt-1 text-center text-xs text-ink-soft">
        インフルエンサーやパートナーからコードをもらった方は、こちらに入力してください。なくても登録できます。
      </p>
      <input
        id="referral-code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="例: AB12CD34"
        className="mt-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-sm font-medium tracking-wider text-ink outline-none focus:border-signal"
      />
    </div>
  );
}
