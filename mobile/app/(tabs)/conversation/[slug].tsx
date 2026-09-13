import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ConversationRoom } from "@/components/conversation/ConversationRoom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { isEntitled } from "@/lib/entitlements";
import { CATEGORY_LABELS, LEVEL_LABELS, type ScenarioCategory, type ScenarioLevel } from "@/lib/scenarios";
import { getScenarioBySlug, type ScenarioDetail } from "@/lib/queries/scenarios";

export default function ConversationScenarioScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [scenario, setScenario] = useState<ScenarioDetail | null | undefined>(undefined);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof slug === "string") getScenarioBySlug(slug).then(setScenario);
  }, [slug]);

  useEffect(() => {
    isEntitled(user?.id).then(setSubscribed);
  }, [user]);

  if (scenario === undefined) {
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
  // per-user), so login is required even for the free scenario.
  const unlocked = !!user && (scenario.is_free || subscribed);

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Badge label={CATEGORY_LABELS[(scenario.category as ScenarioCategory) ?? "teammates"]} accent="neutral" />
        <Badge label={LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]} accent="signal" />
        {scenario.is_free && <Badge label="無料お試し" accent="amber" />}
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
          <Heading level={4}>{!user ? "ログインが必要です" : "このシーンはロックされています"}</Heading>
          <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
            {!user
              ? scenario.is_free
                ? "この無料シーンを試すには、ログインが必要です。"
                : "ログインの上、有料プランへの登録が必要です。"
              : "有料プランへの登録で全シーンが練習できます。"}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            {!user && <Button label="ログイン" variant="secondary" onPress={() => router.push("/login")} />}
            <Button label="料金プランを見る" onPress={() => router.push("/(tabs)/mypage")} />
          </View>
        </Card>
      )}
    </ScreenScroll>
  );
}
