import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, TTS_MODEL } from "@/lib/openai";
import type { ConversationTurn } from "@/lib/conversation";

const AUDIO_BUCKET = "bizitalk-audio";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  const turnIndex = Number.parseInt(index, 10);

  if (!Number.isInteger(turnIndex) || turnIndex < 0) {
    return NextResponse.json({ error: "invalid_index" }, { status: 400 });
  }

  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("id, transcript, voice")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const transcript = (session.transcript ?? []) as ConversationTurn[];
  const turn = transcript[turnIndex];

  if (!turn || turn.role !== "assistant") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const objectPath = `conversation/${session.id}-${turnIndex}.mp3`;

  const { data: cached } = await admin.storage
    .from(AUDIO_BUCKET)
    .download(objectPath);

  if (cached) {
    const buffer = Buffer.from(await cached.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Audio-Source": "cache",
      },
    });
  }

  const openai = createOpenAIClient();
  const speech = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: session.voice ?? "alloy",
    input: turn.text,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await speech.arrayBuffer());

  await admin.storage.from(AUDIO_BUCKET).upload(objectPath, buffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Audio-Source": "openai-tts",
    },
  });
}
