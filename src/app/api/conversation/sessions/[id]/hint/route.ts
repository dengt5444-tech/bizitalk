import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { createOpenAIClient, CHAT_MODEL } from "@/lib/openai";
import { withCustomTopic, type ConversationTurn } from "@/lib/conversation";

// "Guided mode" (mobile only, so far): the learner can ask for a concrete
// example of what to say next instead of the AI coaching them only after
// the conversation ends. Doesn't touch the session's transcript/turn_count
// — this is a suggestion the learner may or may not actually use, not part
// of the conversation itself.
const HINT_SYSTEM_PROMPT = `You are a helpful business-English coach for a Japanese learner practicing a roleplay conversation. You will see the scenario context and the conversation transcript so far. The learner is unsure what to say next and wants a concrete example, in direct response to the other person's most recent line.

Produce ONE natural, concise English reply the learner could say next — 1 to 2 short sentences, the way a real person would actually say it out loud in this business context. It must directly and appropriately respond to the other person's most recent message.

Respond with ONLY a JSON object with exactly these fields:
{
  "reply": "the suggested English reply, exactly as the learner could say it out loud",
  "gloss": "a natural Japanese translation of that exact reply"
}`;

function isValidTranscript(value: unknown): value is ConversationTurn[] {
  return (
    Array.isArray(value) &&
    value.every(
      (turn) =>
        turn &&
        typeof turn === "object" &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.text === "string",
    )
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("id, transcript, status, custom_topic, conversation_scenarios(system_prompt)")
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

  // For a realtime voice session, the client's transcript can be a beat
  // ahead of what's persisted (sync-transcript is fire-and-forget), so
  // prefer whatever the client sends and only fall back to the DB copy —
  // this is just a suggestion, not something that needs write-level trust.
  const body = await request.json().catch(() => null);
  const clientTranscript = body?.transcript;
  const transcript = isValidTranscript(clientTranscript)
    ? clientTranscript
    : ((session.transcript ?? []) as ConversationTurn[]);

  if (transcript.length === 0) {
    return NextResponse.json({ error: "no_transcript" }, { status: 400 });
  }

  const openai = createOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.6,
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${withCustomTopic(scenario.system_prompt, session.custom_topic)}\n\n${HINT_SYSTEM_PROMPT}`,
      },
      ...transcript.map((turn) => ({ role: turn.role, content: turn.text })),
    ],
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    return NextResponse.json({ error: "hint_failed" }, { status: 502 });
  }

  let reply: string;
  let gloss: string;
  try {
    const parsed = JSON.parse(raw);
    reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    gloss = typeof parsed.gloss === "string" ? parsed.gloss.trim() : "";
  } catch {
    return NextResponse.json({ error: "hint_parse_failed" }, { status: 502 });
  }

  if (!reply) {
    return NextResponse.json({ error: "empty_hint" }, { status: 502 });
  }

  return NextResponse.json({ reply, gloss });
}
