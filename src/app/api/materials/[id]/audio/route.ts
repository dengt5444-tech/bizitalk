import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, TTS_MODEL } from "@/lib/openai";
import { isListeningEntitled } from "@/lib/entitlements";
import type { DialogueLine } from "@/lib/materials";

// Shared with Bijirisu (same Supabase project, same storage bucket) so
// audio already generated and cached there is reused instead of
// re-synthesized.
const AUDIO_BUCKET = "gakuto-audio";

async function synthesizeDialogue(dialogue: DialogueLine[]) {
  const openai = createOpenAIClient();

  const clips = await Promise.all(
    dialogue.map(async (line) => {
      const speech = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: line.voice,
        input: line.text,
        response_format: "mp3",
      });
      return Buffer.from(await speech.arrayBuffer());
    }),
  );

  return Buffer.concat(clips);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("gakuto_materials")
    .select("id, script, voice, is_free, dialogue")
    .eq("id", id)
    .maybeSingle();

  if (!material) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!material.is_free) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!(await isListeningEntitled(user))) {
      return NextResponse.json({ error: "payment_required" }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  const dialogue = (material.dialogue ?? []) as DialogueLine[];
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ script: material.script, voice: material.voice, dialogue }))
    .digest("hex")
    .slice(0, 16);
  const objectPath = `${material.id}-${contentHash}.mp3`;

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

  const buffer =
    dialogue.length > 0
      ? await synthesizeDialogue(dialogue)
      : await (async () => {
          const openai = createOpenAIClient();
          const speech = await openai.audio.speech.create({
            model: TTS_MODEL,
            voice: material.voice ?? "alloy",
            input: material.script,
            response_format: "mp3",
          });
          return Buffer.from(await speech.arrayBuffer());
        })();

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
