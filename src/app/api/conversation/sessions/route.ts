import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, isEntitled } from "@/lib/entitlements";
import { MAX_CONVERSATION_SESSIONS_PER_MONTH } from "@/lib/limits";
import type { ConversationTurn } from "@/lib/conversation";

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

  if (!isAdminEmail(user.email)) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("conversation_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    if ((count ?? 0) >= MAX_CONVERSATION_SESSIONS_PER_MONTH) {
      return NextResponse.json(
        { error: "monthly_limit_reached" },
        { status: 429 },
      );
    }
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

  if (!scenario.is_free && !(await isEntitled(user))) {
    return NextResponse.json({ error: "payment_required" }, { status: 403 });
  }

  const transcript: ConversationTurn[] = [
    { role: "assistant", text: scenario.opening_line },
  ];

  const { data: session, error } = await supabase
    .from("conversation_sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      voice: scenario.voice,
      transcript,
      turn_count: 0,
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
