import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ConversationTurn } from "@/lib/conversation";

// The real-time voice mode talks to OpenAI directly over WebRTC, bypassing
// our server, so the browser calls this endpoint after each finished turn
// to keep the session's transcript (used for feedback) up to date.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const transcript = body?.transcript;
  const turnCount = Number(body?.turnCount);

  if (
    !Array.isArray(transcript) ||
    !transcript.every(
      (turn): turn is ConversationTurn =>
        turn &&
        (turn.role === "assistant" || turn.role === "user") &&
        typeof turn.text === "string",
    )
  ) {
    return NextResponse.json({ error: "invalid_transcript" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase
    .from("conversation_sessions")
    .update({
      transcript,
      turn_count: Number.isFinite(turnCount) ? Math.max(0, Math.min(turnCount, 500)) : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
