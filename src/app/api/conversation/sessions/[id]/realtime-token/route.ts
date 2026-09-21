import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthedClient } from "@/lib/supabase/api";
import { REALTIME_MODEL } from "@/lib/openai";
import { freeTalkOpeningLine, withCustomTopic } from "@/lib/conversation";

const REALTIME_SYSTEM_SUFFIX = `
This is a live, real-time SPOKEN conversation over voice, not a text chat. You can hear the learner and they can hear you.
Speak the way a real person actually talks out loud: natural pace, natural pauses, contractions, occasional brief acknowledgements ("Right", "Got it", "Sure"). Keep each turn fairly short (roughly 1-3 sentences) and conversational, like a real phone or video call, not a monologue.
Stay in character the whole time. Ask a natural follow-up question most of the time to keep the conversation flowing, the way a real colleague or counterpart would.
If the learner's English is a little unclear, respond the way a patient native speaker would in real life: infer their intent and keep the conversation moving naturally. Do not correct their English mid-conversation — detailed feedback is given separately after the call ends.
If the learner starts speaking while you're mid-sentence, treat it as a natural interruption and yield to them, the way a real person would.
Start the call now: open in character with a natural greeting along these lines (you don't need to say it word-for-word, just capture the idea in your own voice): "{{OPENING_LINE}}"`;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select(
      "id, status, realtime_started_at, custom_topic, conversation_scenarios(system_prompt, opening_line, realtime_voice)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json({ error: "session_ended" }, { status: 409 });
  }

  const scenario = Array.isArray(session.conversation_scenarios)
    ? session.conversation_scenarios[0]
    : session.conversation_scenarios;

  if (!scenario) {
    return NextResponse.json({ error: "scenario_missing" }, { status: 500 });
  }

  const openingLine = freeTalkOpeningLine(session.custom_topic, scenario.opening_line);
  const instructions = `${withCustomTopic(scenario.system_prompt, session.custom_topic)}\n${REALTIME_SYSTEM_SUFFIX.replace("{{OPENING_LINE}}", openingLine)}`;
  const safetyIdentifier = createHash("sha256").update(user.id).digest("hex");

  // The "first token issuance" bookkeeping write doesn't need to finish
  // before we can ask OpenAI for the ephemeral key — nothing downstream
  // depends on it — so it runs alongside that request instead of blocking
  // it. OpenAI's response is what the caller is actually waiting on, since
  // it's the last thing standing between clicking "start" and being able
  // to talk.
  const bookkeepingPromise = session.realtime_started_at
    ? Promise.resolve()
    : supabase
        .from("conversation_sessions")
        .update({ realtime_started_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

  const [response] = await Promise.all([
    fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifier,
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions,
          audio: {
            output: { voice: scenario.realtime_voice },
            input: {
              // gpt-4o-mini-transcribe over whisper-1: notably less prone to
              // hallucinating a phantom phrase from a brief noise blip or
              // silence, which was turning into fake conversation turns
              // the AI would then reply to.
              transcription: { model: "gpt-4o-mini-transcribe" },
              // "low" eagerness makes the model more patient about deciding
              // the learner has actually started/finished talking, instead
              // of reacting to every brief noise blip or mic echo of its
              // own voice.
              //
              // create_response: false is the actual fix for the AI replying
              // to things the learner never said. By default the server
              // auto-generates a reply the instant it decides the learner's
              // turn ended — including for a turn triggered by a noise blip
              // or the AI hearing its own voice through the speakers, whose
              // transcript then comes back empty or garbled. The client used
              // to filter that bad transcript out of the on-screen log, but
              // the server had already started talking by then regardless of
              // what got shown, which is what made the conversation look
              // like it was continuing on its own. With this off, nothing
              // makes the AI speak except an explicit response.create sent
              // from the client (see ConversationRoom.tsx), which only
              // happens after the transcript has passed those same checks —
              // so unvalidated audio can no longer produce a reply at all.
              turn_detection: { type: "semantic_vad", eagerness: "low", create_response: false },
            },
          },
        },
      }),
    }),
    bookkeepingPromise,
  ]);

  if (!response.ok) {
    const detail = await response.text();
    console.error("realtime client_secrets request failed:", response.status, detail);
    Sentry.captureMessage("realtime client_secrets request failed", {
      level: "error",
      extra: { status: response.status, detail },
    });
    return NextResponse.json({ error: "realtime_unavailable" }, { status: 502 });
  }

  const data = await response.json();

  return NextResponse.json({
    clientSecret: data.value,
    expiresAt: data.expires_at ?? null,
  });
}
