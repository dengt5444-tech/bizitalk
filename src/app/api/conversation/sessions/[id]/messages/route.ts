import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOpenAIClient, CHAT_MODEL } from "@/lib/openai";
import {
  MAX_TURNS_PER_SESSION,
  withCustomTopic,
  type ConversationTurn,
} from "@/lib/conversation";

const SYSTEM_PROMPT_SUFFIX = `
You are roleplaying as this character in a spoken business-English practice conversation with a Japanese learner.
Stay in character at all times. Keep replies natural and conversational, like something a real person would actually say out loud: 1-3 short sentences, no bullet points, no labels, no stage directions.
Ask a natural follow-up question most of the time to keep the conversation going, the way a real colleague or counterpart would.
Gently keep the conversation on the scenario's topic. If the learner's English is unclear, respond the way a patient native speaker would: infer their intent and keep the conversation moving naturally rather than pointing out the error mid-conversation (detailed feedback is given separately, after the conversation ends).`;

export async function POST(
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
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select(
      "id, transcript, status, turn_count, custom_topic, conversation_scenarios(system_prompt, persona_name)",
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

  if (session.turn_count >= MAX_TURNS_PER_SESSION) {
    return NextResponse.json({ error: "session_limit_reached" }, { status: 409 });
  }

  const scenario = Array.isArray(session.conversation_scenarios)
    ? session.conversation_scenarios[0]
    : session.conversation_scenarios;

  if (!scenario) {
    return NextResponse.json({ error: "scenario_missing" }, { status: 500 });
  }

  const transcript = (session.transcript ?? []) as ConversationTurn[];

  const openai = createOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.8,
    max_tokens: 220,
    messages: [
      {
        role: "system",
        content: `${withCustomTopic(scenario.system_prompt, session.custom_topic)}\n${SYSTEM_PROMPT_SUFFIX}`,
      },
      ...transcript.map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
      { role: "user", content: text },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();

  if (!reply) {
    return NextResponse.json({ error: "empty_reply" }, { status: 502 });
  }

  const nextTranscript: ConversationTurn[] = [
    ...transcript,
    { role: "user", text },
    { role: "assistant", text: reply },
  ];
  const nextTurnCount = session.turn_count + 1;

  const { error } = await supabase
    .from("conversation_sessions")
    .update({
      transcript: nextTranscript,
      turn_count: nextTurnCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    reply,
    assistantIndex: nextTranscript.length - 1,
    turnCount: nextTurnCount,
    turnLimitReached: nextTurnCount >= MAX_TURNS_PER_SESSION,
  });
}
