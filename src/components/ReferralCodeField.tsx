"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
    <div className="mx-auto mt-8 max-w-xs">
      <label htmlFor="referral-code" className="text-xs font-medium text-ink-soft">
        紹介コード(お持ちの方のみ)
      </label>
      <input
        id="referral-code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="例: AB12CD34"
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-sm tracking-wider text-ink outline-none focus:border-signal"
      />
    </div>
  );
}
