import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Button, EmptyState, ErrorState, Loading, Screen, SectionHeader, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formatDateTime, one } from "@/lib/format";
import { fetchCompletedSessions } from "@/lib/queries";
import { useAsync } from "@/lib/useAsync";
import { fonts, useColors } from "@/theme";
import { LoginRequired } from "@/components/LoginRequired";

export default function HistoryScreen() {
  const { user } = useAuth();
  if (!user) return <LoginRequired message="会話の記録を見るにはログインしてください。" />;
  return <HistoryList />;
}

function HistoryList() {
  const colors = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useAsync(fetchCompletedSessions, []);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState onRetry={reload} />;
  const sessions = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader eyebrow="History" title="会話の記録" description="これまでの会話とAIコーチのフィードバックをいつでも見返せます。" />
      {sessions.length === 0 ? (
        <EmptyState title="まだ会話の記録がありません" description="シーンを選んでAIと話してみましょう。">
          <Button title="シーン一覧へ" size="sm" onPress={() => router.navigate("/conversation")} />
        </EmptyState>
      ) : (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }}>
          {sessions.map((s) => {
            const scenario = one(s.conversation_scenarios);
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/history/${s.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.line, backgroundColor: pressed ? colors.paperDim : "transparent" },
                ]}
              >
                <Avatar name={scenario?.persona_name ?? "?"} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="heading" style={{ fontSize: 15 }}>
                    {scenario?.title ?? "削除されたシーン"}
                  </Text>
                  <Text variant="caption">
                    {formatDateTime(s.ended_at)} ・ {s.turn_count}ターン
                  </Text>
                </View>
                {s.feedback && (
                  <Text style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: "600", color: colors.signal }}>
                    {s.feedback.fluencyScore}
                    <Text variant="caption">/5</Text>
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
