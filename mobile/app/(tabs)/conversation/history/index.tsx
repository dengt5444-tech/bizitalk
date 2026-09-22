import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, PressableCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { listCompletedSessions, type HistorySession } from "@/lib/queries/conversationHistory";

export default function ConversationHistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    if (!user) return Promise.resolve();
    return listCompletedSessions()
      .then((data) => {
        setSessions(data);
        setLoadError(false);
        setLoadErrorDetail("");
      })
      .catch((err) => {
        setLoadError(true);
        setLoadErrorDetail(err instanceof Error ? err.message : "");
      });
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  if (initializing) {
    return (
      <ScreenScroll contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ScreenScroll>
    );
  }

  if (user && !sessions) {
    if (loadError) {
      return (
        <ScreenScroll contentContainerStyle={{ gap: 20 }}>
          <ErrorState onRetry={reload} message={loadErrorDetail || undefined} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ gap: 20 }}>
        <SkeletonList count={4} />
      </ScreenScroll>
    );
  }

  if (!user) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 16, flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text weight="medium">ログインすると会話の記録が見られます</Text>
        <Button label="ログイン" onPress={() => router.push("/login")} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      contentContainerStyle={{ gap: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.signal} />
      }
    >
      <View>
        <Text eyebrow color="signal" weight="medium">
          History
        </Text>
        <Heading level={1} style={{ marginTop: 6 }}>
          会話の記録
        </Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          これまでの会話とAIコーチのフィードバックをいつでも見返せます。
        </Text>
      </View>

      {!sessions || sessions.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 10, paddingVertical: 32, borderStyle: "dashed" }}>
          <Text weight="medium">まだ会話の記録がありません</Text>
          <Text size={13} color="inkSoft">
            シーンを選んでAIと話してみましょう。
          </Text>
          <Button label="シーン一覧へ" onPress={() => router.push("/(tabs)/conversation")} />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {sessions.map((s) => (
            <PressableCard
              key={s.id}
              onPress={() => router.push(`/(tabs)/conversation/history/${s.id}`)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <Avatar name={s.personaName} />
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">{s.scenarioTitle}</Text>
                  <Text size={12} color="inkFaint">
                    {s.endedAt
                      ? new Date(s.endedAt).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })
                      : ""}
                    {" ・ "}
                    {s.turnCount}ターン
                  </Text>
                </View>
              </View>
              {s.fluencyScore !== null && (
                <Text weight="semibold" color="signal">
                  {s.fluencyScore}
                  <Text size={11} color="inkFaint">
                    /5
                  </Text>
                </Text>
              )}
            </PressableCard>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}
