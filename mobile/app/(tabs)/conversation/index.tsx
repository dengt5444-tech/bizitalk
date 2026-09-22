import { useRouter } from "expo-router";
import { ChevronDown, Clock } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PressableCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { isEntitled } from "@/lib/entitlements";
import { FREE_TALK_SLUG } from "@/lib/conversation";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ORDER, LEVEL_LABELS, type ScenarioCategory, type ScenarioLevel } from "@/lib/scenarios";
import { listScenarios, type ScenarioSummary } from "@/lib/queries/scenarios";

export default function ConversationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ScenarioCategory>>(new Set());

  const reload = useCallback(() => {
    return listScenarios()
      .then((data) => {
        setScenarios(data);
        setLoadError(false);
        setLoadErrorDetail("");
      })
      .catch((err) => {
        setLoadError(true);
        setLoadErrorDetail(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    isEntitled(user?.id).then(setSubscribed);
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  function toggleCategory(category: ScenarioCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  if (!scenarios) {
    if (loadError) {
      return (
        <ScreenScroll contentContainerStyle={{ gap: 28 }}>
          <ErrorState onRetry={reload} />
          {!!loadErrorDetail && (
            <Text size={11} color="rose" style={{ padding: 10, borderWidth: 1, borderColor: theme.colors.rose }}>
              [DEBUG] {loadErrorDetail}
            </Text>
          )}
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ gap: 28 }}>
        <SkeletonList count={4} />
      </ScreenScroll>
    );
  }

  const loggedInAndEntitled = (isFree: boolean) => !!user && (isFree || subscribed);
  const freeTalk = scenarios.find((s) => s.slug === FREE_TALK_SLUG) ?? null;

  const groups = new Map<ScenarioCategory, ScenarioSummary[]>();
  for (const category of CATEGORY_ORDER) groups.set(category, []);
  for (const scenario of scenarios) {
    if (scenario.slug === FREE_TALK_SLUG) continue;
    groups.get(scenario.category)?.push(scenario);
  }

  return (
    <ScreenScroll
      contentContainerStyle={{ gap: 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.signal} />
      }
    >
      <View>
        <Text eyebrow color="signal" weight="medium">
          Conversation
        </Text>
        <Heading level={1} style={{ marginTop: 6 }}>
          AI会話練習
        </Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          誰と、どんな場面で話すかで英語は変わります。相手役ごとにキャラクター設定されたAIと練習し、会話が終わるとAIコーチがフィードバックしてくれます。
        </Text>
      </View>

      {loadError && (
        <Text size={13} color="rose">
          最新の情報を取得できませんでした。表示中の内容は古い可能性があります。
        </Text>
      )}

      {freeTalk && (
        <PressableCard
          onPress={() => router.push(`/(tabs)/conversation/${freeTalk.slug}`)}
          style={{ gap: 8, borderColor: `${theme.colors.signal}55` }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Avatar name={freeTalk.persona_name} size="sm" />
            <Text weight="semibold" style={{ flex: 1 }}>
              {freeTalk.title}
            </Text>
            {!loggedInAndEntitled(freeTalk.is_free) && <Badge label="ロック中" accent="neutral" />}
          </View>
          <Text size={13} color="inkSoft" style={{ lineHeight: 18 }}>
            {freeTalk.description}
          </Text>
          <Text size={13} color="signal" weight="medium">
            {loggedInAndEntitled(freeTalk.is_free) ? "話してみる →" : "詳細を見る →"}
          </Text>
        </PressableCard>
      )}

      {CATEGORY_ORDER.map((category) => {
        const items = groups.get(category) ?? [];
        if (items.length === 0) return null;
        const isOpen = !collapsed.has(category);

        return (
          <View key={category} style={{ gap: 12 }}>
            <Pressable
              onPress={() => toggleCategory(category)}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Heading level={3}>{CATEGORY_LABELS[category]}</Heading>
                  <Text size={13} color="inkFaint">
                    {items.length}シーン
                  </Text>
                </View>
                <Text size={13} color="inkSoft" style={{ marginTop: 2 }}>
                  {CATEGORY_DESCRIPTIONS[category]}
                </Text>
              </View>
              <View style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }], marginTop: 4 }}>
                <ChevronDown size={18} strokeWidth={2} color={theme.colors.inkFaint} />
              </View>
            </Pressable>

            {isOpen &&
              items.map((scenario) => {
                const unlocked = loggedInAndEntitled(scenario.is_free);
                return (
                  <PressableCard
                    key={scenario.id}
                    onPress={() => router.push(`/(tabs)/conversation/${scenario.slug}`)}
                    style={{ gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Avatar name={scenario.persona_name} size="sm" />
                      <Text weight="semibold" style={{ flex: 1 }}>
                        {scenario.title}
                      </Text>
                      <Badge label={LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]} accent="neutral" />
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <Text size={12} weight="medium" color="signal">
                        話し相手: {scenario.persona_name}({scenario.persona_role})
                      </Text>
                      {!!scenario.estimated_minutes && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Clock size={11} strokeWidth={2} color={theme.colors.inkFaint} />
                          <Text size={12} color="inkFaint">
                            目安 {scenario.estimated_minutes}分
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text size={13} color="inkSoft" style={{ lineHeight: 18 }}>
                      {scenario.description}
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text size={13} color="signal" weight="medium">
                        {unlocked ? "話してみる →" : "詳細を見る →"}
                      </Text>
                      {scenario.is_free && <Badge label="無料" accent="amber" />}
                    </View>
                  </PressableCard>
                );
              })}
          </View>
        );
      })}
    </ScreenScroll>
  );
}
