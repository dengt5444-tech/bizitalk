import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, TTS_MODEL } from "@/lib/openai";
import { isListeningEntitled } from "@/lib/entitlements";
import type { DialogueLine } from "@/lib/materials";

// Shared with Bijirisu (same Supabase project, same storage bucket) so
// audio already generated and cached there is reused instead of
// re-synthesized.
const AUDIO_BUCKET = "gakuto-audio";
const SIGNED_URL_TTL_SECONDS = 60 * 30;

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

  const { supabase, user } = await getAuthedClient();
  const { data: material } = await supabase
    .from("gakuto_materials")
    .select("id, script, voice, is_free, dialogue")
    .eq("id", id)
    .maybeSingle();

  if (!material) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!material.is_free) {
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!(await isListeningEntitled(user, supabase))) {
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

  // Redirecting to a short-lived signed URL lets the browser stream
  // straight from Supabase's storage CDN (with Range-request/seek support)
  // instead of this route downloading the whole file into memory first and
  // re-sending it — that extra hop was the main source of playback lag on
  // every cached (i.e. near-every) request.
  const { data: signed } = await admin.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signed?.signedUrl) {
    return NextResponse.redirect(signed.signedUrl);
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

  const { data: freshSigned } = await admin.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (freshSigned?.signedUrl) {
    return NextResponse.redirect(freshSigned.signedUrl);
  }

  // Signing failed for some reason — fall back to serving the bytes we
  // already have in hand rather than erroring out.
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Audio-Source": "openai-tts",
    },
  });
}
