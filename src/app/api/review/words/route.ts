import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sourceTitle, word, meaning } = body ?? {};

  if (typeof word !== "string" || word.trim() === "") {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const { error } = await supabase.from("saved_words").upsert(
    {
      user_id: user.id,
      source_title: sourceTitle ?? "",
      word,
      meaning: meaning ?? "",
    },
    { onConflict: "user_id,word" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
