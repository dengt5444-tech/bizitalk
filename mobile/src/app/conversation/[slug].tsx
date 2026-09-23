import { Stack, router, useLocalSearchParams } from "expo-router";
import { BookOpen, Clock } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ConversationRoom } from "@/components/conversation/ConversationRoom";
import { SceneImage } from "@/components/SceneImage";
import { Badge, Button, Card, ErrorState, Loading, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fetchScenario } from "@/lib/queries";
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  SCENARIO_SCENES,
  type ScenarioCategory,
  type ScenarioLevel,
} from "@/lib/scenarios";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function ScenarioScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: scenario, error, loading, reload } = useAsync(() => fetchScenario(slug), [slug]);

  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (!scenario) return <ErrorState message="シーンが見つかりませんでした。" />;

  return (
    <Screen>
      <Stack.Screen options={{ title: scenario.title }} />
      <View style={{ borderRadius: 20, overflow: "hidden" }}>
        <SceneImage scene={SCENARIO_SCENES[scenario.slug] ?? "meeting"} style={{ height: 190 }} />
      </View>

      <View style={styles.badges}>
        <Badge label={CATEGORY_LABELS[(scenario.category as ScenarioCategory) ?? "teammates"]} />
        <Badge tone="signal" label={LEVEL_LABELS[(scenario.level as ScenarioLevel) ?? "beginner"]} />
        {scenario.estimated_minutes ? (
          <Badge label={`目安 ${scenario.estimated_minutes}分`} icon={<Clock size={11} color={colors.inkFaint} />} />
        ) : null}
      </View>

      <View style={styles.titleRow}>
        <Avatar name={scenario.persona_name} size="lg" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" style={{ fontSize: 22, lineHeight: 30 }}>
            {scenario.title}
          </Text>
          <Text variant="small" tone="signal" weight="600">
            話し相手: {scenario.persona_name}（{scenario.persona_role}）
          </Text>
        </View>
      </View>
      <Text>{scenario.description}</Text>
      {scenario.persona_background ? (
        <Text variant="small" tone="inkFaint">
          {scenario.persona_background}
        </Text>
      ) : null}

      {(scenario.briefing_en || scenario.briefing_ja) && (
        <Card tone="signalTint" style={{ gap: 10 }}>
          <View style={styles.briefingHeader}>
            <BookOpen size={15} color={colors.signalDim} />
            <Text variant="caption" weight="600" style={{ color: colors.signalDim, letterSpacing: 1.5 }}>
              始める前に読んでおきましょう
            </Text>
          </View>
          {scenario.briefing_en ? (
            <Text variant="small" tone="ink" selectable>
              {scenario.briefing_en}
            </Text>
          ) : null}
          {scenario.briefing_ja ? <Text variant="small">{scenario.briefing_ja}</Text> : null}
        </Card>
      )}

      {user ? (
        <ConversationRoom
          scenario={{
            slug: scenario.slug,
            title: scenario.title,
            personaName: scenario.persona_name,
            personaRole: scenario.persona_role,
          }}
        />
      ) : (
        <Card tone="paperDim" style={{ alignItems: "center", gap: 10 }}>
          <Text variant="heading">ログインが必要です</Text>
          <Text variant="small" center>
            ログインすれば、このシーンも月5分まで無料でお試しいただけます。
          </Text>
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 6 }}>
            <Button title="ログイン" onPress={() => router.push("/login")} />
            <Button title="料金プランを見る" variant="outline" onPress={() => router.push("/pricing")} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  briefingHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
});
