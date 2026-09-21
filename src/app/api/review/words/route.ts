import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient();

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
