import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ConversationRoom } from "@/components/conversation/ConversationRoom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { CATEGORY_LABELS, LEVEL_LABELS, type ScenarioCategory, type ScenarioLevel } from "@/lib/scenarios";
import { getScenarioBySlug, type ScenarioDetail } from "@/lib/queries/scenarios";

export default function ConversationScenarioScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [scenario, setScenario] = useState<ScenarioDetail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(() => {
    if (typeof slug !== "string") return Promise.resolve();
    return getScenarioBySlug(slug)
      .then((data) => {
        setScenario(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (scenario === undefined) {
    if (loadError) {
      return (
        <ScreenScroll>
          <ErrorState onRetry={reload} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ScreenScroll>
    );
  }

  if (!scenario) {
    return (
      <ScreenScroll>
        <Text>シーンが見つかりませんでした。</Text>
      </ScreenScroll>
    );
  }

  // Conversation practice always needs an account (each session is saved
  // per-user, and usage is tracked per-user for the monthly minutes cap),
  // but every scenario is open to any signed-in user — a plan only changes
  // how many minutes/month they get.
  const unlocked = !!user;

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Badge label={CATEGORY_LABELS[(scenario.category as ScenarioCategory) ?? "teammates"]} accent="neutral" />
        <Badge label={LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]} accent="signal" />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={scenario.persona_name} size="lg" />
        <View style={{ flex: 1 }}>
          <Heading level={2}>{scenario.title}</Heading>
          <Text size={13} weight="medium" color="signal">
            話し相手: {scenario.persona_name}({scenario.persona_role})
          </Text>
        </View>
      </View>
      <Text color="inkSoft" style={{ lineHeight: 20 }}>
        {scenario.description}
      </Text>
      {!!scenario.persona_background && (
        <Text size={13} color="inkFaint" style={{ lineHeight: 18 }}>
          {scenario.persona_background}
        </Text>
      )}

      {unlocked ? (
        <ConversationRoom
          scenario={{
            slug: scenario.slug,
            title: scenario.title,
            personaName: scenario.persona_name,
            personaRole: scenario.persona_role,
            openingLine: scenario.opening_line,
          }}
        />
      ) : (
        <Card style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
          <Heading level={4}>ログインが必要です</Heading>
          <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
            ログインすれば、このシーンも月5分まで無料でお試しいただけます。
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Button label="ログイン" variant="secondary" onPress={() => router.push("/login")} />
          </View>
        </Card>
      )}
    </ScreenScroll>
  );
}
