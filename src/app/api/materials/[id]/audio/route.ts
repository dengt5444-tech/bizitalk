import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, TTS_MODEL } from "@/lib/openai";
import { joinPcmClipsToWav, parseWavPcm } from "@/lib/wav";
import type { DialogueLine } from "@/lib/materials";

// Shared with Bijirisu (same Supabase project, same storage bucket) so
// audio already generated and cached there is reused instead of
// re-synthesized.
const AUDIO_BUCKET = "gakuto-audio";
const SIGNED_URL_TTL_SECONDS = 60 * 30;
// Lets the browser reuse the redirect itself on a repeat visit/replay
// instead of re-hitting this route (and Supabase's sign API) every time —
// kept safely under the signed URL's own TTL so a cached redirect never
// points at an already-expired link.
const REDIRECT_CACHE_HEADERS = { "Cache-Control": `private, max-age=${SIGNED_URL_TTL_SECONDS - 120}` };

// A natural-feeling pause between alternating speakers' lines.
const DIALOGUE_GAP_MS = 350;

// Each dialogue line used to be synthesized as its own standalone mp3 clip
// and joined with a raw Buffer.concat. Every mp3 clip is an independently
// encoded stream with its own encoder priming silence and header frames —
// concatenating the bytes of several of them produces small gaps, clicks,
// and occasionally a garbled moment at every seam. Since almost every
// listening material alternates between two speakers, that meant a seam
// every line or two, which is what showed up as choppy, hard-to-follow,
// lagging dialogue audio. Requesting wav (raw PCM) instead and joining the
// actual sample data — with an explicit, deliberate silence gap inserted
// between lines — produces one genuinely gapless file.
async function synthesizeDialogue(dialogue: DialogueLine[]) {
  const openai = createOpenAIClient();

  const clips = await Promise.all(
    dialogue.map(async (line) => {
      const speech = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: line.voice,
        input: line.text,
        response_format: "wav",
      });
      return parseWavPcm(Buffer.from(await speech.arrayBuffer()));
    }),
  );

  return joinPcmClipsToWav(clips, DIALOGUE_GAP_MS);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("gakuto_materials")
    .select("id, script, voice, dialogue")
    .eq("id", id)
    .maybeSingle();

  if (!material) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const dialogue = (material.dialogue ?? []) as DialogueLine[];
  const isDialogue = dialogue.length > 0;
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ script: material.script, voice: material.voice, dialogue }))
    .digest("hex")
    .slice(0, 16);
  // Dialogue audio is now stitched as wav (see synthesizeDialogue) rather
  // than mp3 — the different extension also means a material that was
  // cached under the old, glitchy concatenated-mp3 path gets regenerated
  // cleanly here instead of reusing that stale file.
  const objectPath = `${material.id}-${contentHash}.${isDialogue ? "wav" : "mp3"}`;
  const contentType = isDialogue ? "audio/wav" : "audio/mpeg";

  // Redirecting to a short-lived signed URL lets the browser stream
  // straight from Supabase's storage CDN (with Range-request/seek support)
  // instead of this route downloading the whole file into memory first and
  // re-sending it — that extra hop was the main source of playback lag on
  // every cached (i.e. near-every) request.
  const { data: signed } = await admin.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signed?.signedUrl) {
    return NextResponse.redirect(signed.signedUrl, { headers: REDIRECT_CACHE_HEADERS });
  }

  const buffer = isDialogue
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
    contentType,
    upsert: true,
  });

  const { data: freshSigned } = await admin.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (freshSigned?.signedUrl) {
    return NextResponse.redirect(freshSigned.signedUrl, { headers: REDIRECT_CACHE_HEADERS });
  }

  // Signing failed for some reason — fall back to serving the bytes we
  // already have in hand rather than erroring out.
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Audio-Source": "openai-tts",
    },
  });
}
