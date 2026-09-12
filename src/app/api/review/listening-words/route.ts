import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Saved words from the listening-materials feature live in the shared
// Supabase project's own gakuto_saved_words table (the same table Bijirisu
// uses) — kept separate from this app's own `saved_words` table (AI
// conversation vocab) since they're different products with different
// entitlements.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { materialId, materialTitle, word, meaning } = body ?? {};

  if (typeof word !== "string" || word.trim() === "") {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const { error } = await supabase.from("gakuto_saved_words").upsert(
    {
      user_id: user.id,
      material_id: materialId ?? null,
      material_title: materialTitle ?? "",
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
