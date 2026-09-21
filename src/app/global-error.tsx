"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-semibold">
            予期しないエラーが発生しました
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            お手数ですが、ページを再読み込みしてください。
          </p>
        </main>
      </body>
    </html>
  );
}
