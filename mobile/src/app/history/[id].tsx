import { useLocalSearchParams } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ChatBubble } from "@/components/conversation/ChatBubble";
import { FeedbackPanel } from "@/components/conversation/FeedbackPanel";
import { LoginRequired } from "@/components/LoginRequired";
import { Card, ErrorState, Loading, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formatDateTime, one } from "@/lib/format";
import { fetchSession } from "@/lib/queries";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function HistoryDetailScreen() {
  const { user } = useAuth();
  if (!user) return <LoginRequired message="会話の記録を見るにはログインしてください。" />;
  return <HistoryDetail userId={user.id} />;
}

function HistoryDetail({ userId }: { userId: string }) {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, error, loading, reload } = useAsync(() => fetchSession(id, userId), [id, userId]);
  const [showTranscript, setShowTranscript] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (!session || !session.feedback) return <ErrorState message="会話の記録が見つかりませんでした。" />;

  const scenario = one(session.conversation_scenarios);
  const transcript = session.transcript ?? [];

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Avatar name={scenario?.persona_name ?? "?"} size="lg" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" style={{ fontSize: 22, lineHeight: 30 }}>
            {scenario?.title ?? "削除されたシーン"}
          </Text>
          {scenario && (
            <Text variant="small" tone="signal" weight="600">
              話し相手: {scenario.persona_name}（{scenario.persona_role}）
            </Text>
          )}
        </View>
      </View>
      <Text variant="small" tone="inkFaint">
        {formatDateTime(session.ended_at)} ・ {session.turn_count}ターン
      </Text>

      <Card style={{ gap: 14 }}>
        <Pressable
          onPress={() => setShowTranscript((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showTranscript }}
          style={styles.toggle}
        >
          <Text variant="heading" style={{ flex: 1 }}>
            会話の全文を見る
          </Text>
          <ChevronDown
            size={18}
            color={colors.inkFaint}
            style={{ transform: [{ rotate: showTranscript ? "180deg" : "0deg" }] }}
          />
        </Pressable>
        {showTranscript &&
          transcript.map((turn, index) => (
            <ChatBubble key={index} role={turn.role} text={turn.text} personaName={scenario?.persona_name ?? "?"} />
          ))}
      </Card>

      <Card>
        <FeedbackPanel feedback={session.feedback} scenarioTitle={scenario?.title ?? ""} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggle: { flexDirection: "row", alignItems: "center" },
});
