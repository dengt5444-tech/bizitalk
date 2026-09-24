import { router } from "expo-router";
import { ArrowRight, ChevronDown, Clock } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SceneImage } from "@/components/SceneImage";
import { Badge, Card, ErrorState, Loading, Screen, SectionHeader, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { FREE_TALK_SLUG } from "@/lib/conversation";
import { fetchScenarios, type ScenarioListItem } from "@/lib/queries";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  LEVEL_LABELS,
  SCENARIO_SCENES,
  type ScenarioCategory,
  type ScenarioLevel,
} from "@/lib/scenarios";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function ConversationListScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useAsync(fetchScenarios, []);
  const [collapsed, setCollapsed] = useState<Set<ScenarioCategory>>(new Set());
  // Every scenario is open to any signed-in user — a plan only changes how
  // many minutes a month they get.
  const unlocked = !!user;

  const { freeTalk, groups } = useMemo(() => {
    const scenarios = data ?? [];
    const map = new Map<ScenarioCategory, ScenarioListItem[]>(CATEGORY_ORDER.map((c) => [c, []]));
    for (const scenario of scenarios) {
      if (scenario.slug === FREE_TALK_SLUG) continue;
      const category = (scenario.category as ScenarioCategory) ?? "teammates";
      map.get(category)?.push(scenario);
    }
    return { freeTalk: scenarios.find((s) => s.slug === FREE_TALK_SLUG) ?? null, groups: map };
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  function toggle(category: ScenarioCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <Screen topInset refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader
        eyebrow="Conversation"
        title="AI会話練習"
        description="誰と、どんな場面で話すかで英語は変わります。相手役ごとにキャラクター設定されたAIとリアルタイム音声で練習し、会話が終わるとAIコーチがフィードバックしてくれます。"
      />
      <Text variant="small" tone="inkFaint">
        ログインすれば、どのシーンも月5分まで無料でお試しいただけます。
      </Text>

      {freeTalk && (
        <Card
          tone="signalTint"
          padded={false}
          onPress={() => router.push(`/conversation/${freeTalk.slug}`)}
          accessibilityLabel={freeTalk.title}
          style={{ overflow: "hidden" }}
        >
          <SceneImage scene={SCENARIO_SCENES[freeTalk.slug] ?? "casual"} style={{ height: 120 }} />
          <View style={{ padding: 18, gap: 8 }}>
            <View style={styles.row}>
              <Avatar name={freeTalk.persona_name} size="sm" />
              <Text variant="heading" style={{ flex: 1 }}>
                {freeTalk.title}
              </Text>
            </View>
            <Text variant="small">{freeTalk.description}</Text>
            <View style={styles.row}>
              <Text variant="small" tone="signal" weight="600">
                {unlocked ? "話してみる" : "詳細を見る"}
              </Text>
              <ArrowRight size={15} color={colors.signal} />
            </View>
          </View>
        </Card>
      )}

      {CATEGORY_ORDER.map((category) => {
        const items = groups.get(category) ?? [];
        if (items.length === 0) return null;
        const isCollapsed = collapsed.has(category);
        return (
          <View key={category} style={{ gap: 12, marginTop: 8 }}>
            <Pressable
              onPress={() => toggle(category)}
              accessibilityRole="button"
              accessibilityState={{ expanded: !isCollapsed }}
              style={[styles.categoryHeader, { borderBottomColor: colors.line }]}
            >
              <CategoryIcon category={category} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.row}>
                  <Text variant="heading" style={{ fontSize: 18 }}>
                    {CATEGORY_LABELS[category]}
                  </Text>
                  <Text variant="caption">{items.length}シーン</Text>
                </View>
                <Text variant="small">{CATEGORY_DESCRIPTIONS[category]}</Text>
              </View>
              <ChevronDown
                size={18}
                color={colors.inkFaint}
                style={{ transform: [{ rotate: isCollapsed ? "0deg" : "180deg" }] }}
              />
            </Pressable>

            {!isCollapsed &&
              items.map((scenario) => (
                <Card
                  key={scenario.id}
                  padded={false}
                  onPress={() => router.push(`/conversation/${scenario.slug}`)}
                  accessibilityLabel={scenario.title}
                  style={{ overflow: "hidden" }}
                >
                  <View>
                    <SceneImage scene={SCENARIO_SCENES[scenario.slug] ?? "meeting"} style={{ height: 110 }} />
                    <View style={styles.levelBadge}>
                      <Badge tone="surface" label={LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]} />
                    </View>
                  </View>
                  <View style={{ padding: 16, gap: 6 }}>
                    <View style={styles.row}>
                      <Avatar name={scenario.persona_name} size="sm" />
                      <Text variant="heading" style={{ flex: 1 }}>
                        {scenario.title}
                      </Text>
                    </View>
                    <Text variant="caption" tone="signal" weight="600">
                      話し相手: {scenario.persona_name}（{scenario.persona_role}）
                    </Text>
                    {scenario.estimated_minutes ? (
                      <View style={styles.row}>
                        <Clock size={11} color={colors.inkFaint} />
                        <Text variant="caption">目安 {scenario.estimated_minutes}分</Text>
                      </View>
                    ) : null}
                    <Text variant="small">{scenario.description}</Text>
                  </View>
                </Card>
              ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14, borderBottomWidth: 1 },
  levelBadge: { position: "absolute", top: 10, right: 10 },
});
