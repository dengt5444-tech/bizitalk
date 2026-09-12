import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConversationPlan } from "@/lib/entitlements";
import { minutesCapFor } from "@/lib/limits";
import {
  CUSTOM_TOPIC_MAX_LENGTH,
  FREE_TALK_SLUG,
  freeTalkOpeningLine,
  type ConversationTurn,
} from "@/lib/conversation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const scenarioSlug = body?.scenarioSlug;

  if (typeof scenarioSlug !== "string" || scenarioSlug.trim() === "") {
    return NextResponse.json({ error: "invalid_scenario" }, { status: 400 });
  }

  const { data: scenario } = await supabase
    .from("conversation_scenarios")
    .select(
      "id, slug, title, description, category, level, persona_name, persona_role, voice, opening_line, is_free",
    )
    .eq("slug", scenarioSlug)
    .maybeSingle();

  if (!scenario) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const plan = await getConversationPlan(user);

  if (!scenario.is_free && plan === null) {
    return NextResponse.json({ error: "payment_required" }, { status: 403 });
  }

  const capMinutes = minutesCapFor(plan);
  if (capMinutes !== null) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { data: rows } = await supabase
      .from("conversation_sessions")
      .select("duration_seconds")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const usedSeconds = (rows ?? []).reduce(
      (sum, row) => sum + (row.duration_seconds ?? 0),
      0,
    );

    if (usedSeconds >= capMinutes * 60) {
      return NextResponse.json(
        { error: "monthly_limit_reached" },
        { status: 429 },
      );
    }
  }

  const customTopic =
    scenario.slug === FREE_TALK_SLUG && typeof body?.customTopic === "string"
      ? body.customTopic.trim().slice(0, CUSTOM_TOPIC_MAX_LENGTH)
      : null;

  const transcript: ConversationTurn[] = [
    {
      role: "assistant",
      text: freeTalkOpeningLine(customTopic, scenario.opening_line),
    },
  ];

  const { data: session, error } = await supabase
    .from("conversation_sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      voice: scenario.voice,
      transcript,
      turn_count: 0,
      custom_topic: customTopic,
    })
    .select("id, transcript, status, turn_count")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: session.id,
    scenario,
    transcript: session.transcript,
  });
}
