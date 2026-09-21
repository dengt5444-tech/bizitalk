"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Required for App Store review (guideline 5.1.1(v)) on the mobile app,
// but the same self-service deletion belongs on web too — it's the same
// account, same data, and the backend endpoint (api/account/delete) was
// already built to handle either client. Mirrors mobile's DangerZone.
export function DangerZone() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "アカウントを削除しますか?\n\n会話の記録・復習リスト・ご登録中のプランなど、すべてのデータが完全に削除されます。この操作は取り消せません。有料プランをご利用中の場合は、サブスクリプションも自動的に解約されます。",
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error("delete_failed");
      // Clears the session cookie server-side (same route SiteHeader's
      // logout form posts to); we navigate ourselves rather than relying
      // on its redirect response, since fetch() doesn't follow through to
      // an actual browser navigation.
      await fetch("/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      window.alert("削除に失敗しました。しばらくしてからもう一度お試しいただくか、サポートまでご連絡ください。");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose p-5">
      <p className="font-semibold text-rose">アカウントの削除</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        アカウントとすべてのデータを完全に削除します。ご登録中の有料プランも解約されます。この操作は取り消せません。
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-4 rounded-full border border-rose px-5 py-2.5 text-sm font-medium text-rose transition hover:bg-rose-tint disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? "削除中..." : "アカウントを削除する"}
      </button>
    </div>
  );
}
