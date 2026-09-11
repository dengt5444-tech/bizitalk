import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOpenAIClient, FEEDBACK_MODEL } from "@/lib/openai";
import type { ConversationFeedback, ConversationTurn } from "@/lib/conversation";

const FEEDBACK_SYSTEM_PROMPT = `You are a meticulous, encouraging expert business-English coach for Japanese learners. You will be given the scenario context and a transcript of a roleplay conversation between the learner ("Learner") and an AI conversation partner ("Partner").

Analyze ONLY the Learner's lines. The transcript may come from real speech (via automatic transcription), so it can contain filler words ("um", "uh"), false starts, or self-corrections mid-sentence — these are normal spoken-language disfluencies, NOT grammar mistakes. Do not flag them as errors. Only flag genuine issues: grammar, verb tense, word choice, unnatural phrasing, or something a native business-English speaker would clearly not say.

Ground every correction in an exact phrase actually spoken by the Learner — never invent or paraphrase an error that isn't really there. If you are not reasonably confident something is a genuine mistake, leave it out. It is better to return fewer, high-confidence corrections than to over-flag.

Produce feedback as a single JSON object with exactly these fields:
{
  "overallComment": "2-4 sentences in Japanese. Warm, specific, and honest feedback tied to what actually happened in THIS conversation and scenario — not generic advice.",
  "fluencyScore": integer 1-5 (overall spoken business-English fluency; 5 = near-native),
  "categoryScores": {
    "grammar": integer 1-5 (grammatical accuracy),
    "vocabulary": integer 1-5 (range and precision of word choice for a business context),
    "professionalism": integer 1-5 (tone and register appropriate to the business scenario)
  },
  "goodExpressions": array of up to 5 short strings (in English), phrases or sentence patterns the Learner used well and should keep using,
  "corrections": array of up to 8 objects { "original": the Learner's actual spoken sentence/phrase with the issue, quoted verbatim from the transcript, "corrected": a natural corrected version, "explanation": 1 short sentence in Japanese explaining the fix }. Only include real, confident mistakes. If the Learner made no notable mistakes, return an empty array — do not pad this list.
  "vocabSuggestions": array of up to 6 objects { "word": an English word or short business phrase directly relevant to this specific scenario, "meaning": its meaning in Japanese, "example": a natural English example sentence using it in a similar situation }. Suggest vocabulary the Learner didn't use yet but would genuinely help them in this kind of conversation.
}
Respond with ONLY the JSON object, no other text.`;

function clampScore(value: unknown, fallback = 3) {
  return Math.min(5, Math.max(1, Math.round(Number(value) || fallback)));
}

export async function POST(
  _request: Request,
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

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select(
      "id, transcript, status, turn_count, feedback, conversation_scenarios(title, description, persona_role)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (session.status === "completed" && session.feedback) {
    return NextResponse.json({ feedback: session.feedback });
  }

  if (session.turn_count < 1) {
    return NextResponse.json({ error: "not_enough_turns" }, { status: 400 });
  }

  const scenario = Array.isArray(session.conversation_scenarios)
    ? session.conversation_scenarios[0]
    : session.conversation_scenarios;

  const transcript = (session.transcript ?? []) as ConversationTurn[];
  const transcriptText = transcript
    .map((turn) => `${turn.role === "user" ? "Learner" : "Partner"}: ${turn.text}`)
    .join("\n");

  const scenarioContext = scenario
    ? `Scenario: ${scenario.title}\nSituation: ${scenario.description}\nThe Learner is talking with someone in this role: ${scenario.persona_role}\n\n`
    : "";

  const openai = createOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: FEEDBACK_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: FEEDBACK_SYSTEM_PROMPT },
      { role: "user", content: `${scenarioContext}Transcript:\n${transcriptText}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    return NextResponse.json({ error: "feedback_failed" }, { status: 502 });
  }

  let feedback: ConversationFeedback;
  try {
    const parsed = JSON.parse(raw);
    feedback = {
      overallComment: typeof parsed.overallComment === "string" ? parsed.overallComment : "",
      fluencyScore: clampScore(parsed.fluencyScore),
      categoryScores: {
        grammar: clampScore(parsed.categoryScores?.grammar),
        vocabulary: clampScore(parsed.categoryScores?.vocabulary),
        professionalism: clampScore(parsed.categoryScores?.professionalism),
      },
      goodExpressions: Array.isArray(parsed.goodExpressions) ? parsed.goodExpressions.slice(0, 5) : [],
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections.slice(0, 8) : [],
      vocabSuggestions: Array.isArray(parsed.vocabSuggestions) ? parsed.vocabSuggestions.slice(0, 6) : [],
    };
  } catch {
    return NextResponse.json({ error: "feedback_parse_failed" }, { status: 502 });
  }

  const { error } = await supabase
    .from("conversation_sessions")
    .update({
      status: "completed",
      feedback,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback });
}
