import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/api";
import { getConversationPlan } from "@/lib/entitlements";
import { minutesCapFor, usageWindowIsLifetime } from "@/lib/limits";
import {
  CUSTOM_TOPIC_MAX_LENGTH,
  FREE_TALK_SLUG,
  freeTalkOpeningLine,
  type ConversationTurn,
} from "@/lib/conversation";

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const scenarioSlug = body?.scenarioSlug;

  if (typeof scenarioSlug !== "string" || scenarioSlug.trim() === "") {
    return NextResponse.json({ error: "invalid_scenario" }, { status: 400 });
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  // The scenario lookup, the plan lookup, and the usage lookup don't
  // depend on each other's results (only on `user`, already known) — running
  // them concurrently instead of one after another was most of where
  // "starting a conversation" spent its time, since each is its own network
  // round trip to Supabase. The usage rows are fetched unconditionally and
  // without a date filter (cheap, indexed by user_id — realistically few
  // rows either way) since which window actually applies (this calendar
  // month for a paid plan, all-time for the free tier's one-time grant —
  // see usageWindowIsLifetime) isn't known until `plan` resolves below.
  const [{ data: scenario }, plan, { data: usageRows }] = await Promise.all([
    supabase
      .from("conversation_scenarios")
      .select(
        "id, slug, title, description, category, level, persona_name, persona_role, voice, opening_line, is_free",
      )
      .eq("slug", scenarioSlug)
      .maybeSingle(),
    getConversationPlan(user, supabase),
    supabase
      .from("conversation_sessions")
      .select("duration_seconds, created_at")
      .eq("user_id", user.id),
  ]);

  if (!scenario) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Any signed-in user can try any scenario — access isn't gated per
  // scenario. What differs by plan is purely how many minutes they get:
  // FREE_TRIAL_MINUTES once, ever, for no plan, or a larger cap that
  // renews every month per paid tier (see minutesCapFor below).
  const capMinutes = minutesCapFor(plan);
  if (capMinutes !== null) {
    const lifetime = usageWindowIsLifetime(plan);
    const relevantRows = (usageRows ?? []).filter(
      (row) => lifetime || new Date(row.created_at) >= startOfMonth,
    );
    const usedSeconds = relevantRows.reduce(
      (sum, row) => sum + (row.duration_seconds ?? 0),
      0,
    );

    if (usedSeconds >= capMinutes * 60) {
      return NextResponse.json(
        { error: lifetime ? "free_trial_used" : "monthly_limit_reached" },
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
