import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください。" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("waitlist").insert({ email });

  if (error) {
    // Unique violation: already on the list — treat as success rather
    // than an error, since from the visitor's perspective they're done
    // either way.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    console.error("Failed to save waitlist signup:", error.message);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "登録に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
