import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ChatBubble } from "@/components/conversation/ChatBubble";
import { FeedbackPanel } from "@/components/conversation/FeedbackPanel";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { getSessionDetail, type SessionDetail } from "@/lib/queries/conversationHistory";

export default function ConversationHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  const reload = useCallback(() => {
    if (typeof id !== "string") return Promise.resolve();
    return getSessionDetail(id)
      .then((data) => {
        setSession(data);
        setLoadError(false);
        setLoadErrorDetail("");
      })
      .catch((err) => {
        setLoadError(true);
        setLoadErrorDetail(err instanceof Error ? err.message : "");
      });
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (session === undefined) {
    if (loadError) {
      return (
        <ScreenScroll>
          <ErrorState onRetry={reload} message={loadErrorDetail || undefined} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ScreenScroll>
    );
  }

  if (!session) {
    return (
      <ScreenScroll>
        <Text>記録が見つかりませんでした。</Text>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={session.personaName} size="lg" />
        <View style={{ flex: 1 }}>
          <Heading level={2}>{session.scenarioTitle}</Heading>
          <Text size={13} weight="medium" color="signal">
            話し相手: {session.personaName}({session.personaRole})
          </Text>
        </View>
      </View>
      <Text size={12} color="inkFaint">
        {session.endedAt
          ? new Date(session.endedAt).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })
          : ""}
        {` ・ ${session.turnCount}ターン`}
      </Text>

      <Card style={{ gap: 12 }}>
        <Pressable onPress={() => setShowTranscript((v) => !v)}>
          <Text weight="semibold" color="signal">
            {showTranscript ? "会話の全文を隠す" : "会話の全文を見る"}
          </Text>
        </Pressable>
        {showTranscript && (
          <View style={{ gap: 10 }}>
            {session.transcript.map((turn, index) => (
              <ChatBubble key={index} turn={turn} personaName={session.personaName} />
            ))}
          </View>
        )}
      </Card>

      {session.feedback && (
        <Card style={{ gap: 0 }}>
          <FeedbackPanel feedback={session.feedback} scenarioTitle={session.scenarioTitle} />
        </Card>
      )}
    </ScreenScroll>
  );
}
