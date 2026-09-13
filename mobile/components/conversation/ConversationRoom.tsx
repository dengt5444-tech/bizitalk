import { useRouter } from "expo-router";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { api, authedAudioSource } from "@/lib/api";
import { CUSTOM_TOPIC_MAX_LENGTH, FREE_TALK_SLUG, MAX_TURNS_PER_SESSION } from "@/lib/conversation";
import type { ConversationFeedback, ConversationTurn } from "@/lib/conversation";
import { useTheme } from "@/theme/ThemeProvider";
import { ChatBubble } from "./ChatBubble";
import { FeedbackPanel } from "./FeedbackPanel";

type ScenarioInfo = {
  slug: string;
  title: string;
  personaName: string;
  personaRole: string;
  openingLine: string;
};

type Phase = "idle" | "chatting" | "ended";

export function ConversationRoom({ scenario }: { scenario: ScenarioInfo }) {
  const theme = useTheme();
  const router = useRouter();
  const isFreeTalk = scenario.slug === FREE_TALK_SLUG;

  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationTurn[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [inputText, setInputText] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const turnLimitReached = turnCount >= MAX_TURNS_PER_SESSION;

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  async function playAudio(index: number) {
    if (!sessionId) return;
    try {
      const source = await authedAudioSource(`/api/conversation/sessions/${sessionId}/audio/${index}`);
      playerRef.current?.remove();
      const player = createAudioPlayer(source);
      playerRef.current = player;
      player.play();
    } catch {
      // Autoplay can fail silently; the per-message replay button still works.
    }
  }

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const data = await api.post<{ sessionId: string; transcript: ConversationTurn[] }>(
        "/api/conversation/sessions",
        { scenarioSlug: scenario.slug, ...(isFreeTalk ? { customTopic: customTopic.trim() } : {}) },
      );
      setSessionId(data.sessionId);
      setMessages(data.transcript);
      setTurnCount(0);
      setPhase("chatting");
      if (autoPlay) setTimeout(() => playAudio(0), 150);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "monthly_limit_reached"
          ? "今月のAI会話の利用時間の上限に達しました。月が変わると再びご利用いただけます。"
          : "会話を開始できませんでした。もう一度お試しください。",
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !sessionId || sending || turnLimitReached) return;

    setInputText("");
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const data = await api.post<{ reply: string; assistantIndex: number; turnCount: number }>(
        `/api/conversation/sessions/${sessionId}/messages`,
        { text },
      );
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      setTurnCount(data.turnCount);
      if (autoPlay) setTimeout(() => playAudio(data.assistantIndex), 150);
    } catch {
      setError("メッセージを送信できませんでした。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  async function handleEnd() {
    if (!sessionId || ending) return;
    setEnding(true);
    setError(null);
    try {
      const data = await api.post<{ feedback: ConversationFeedback }>(
        `/api/conversation/sessions/${sessionId}/end`,
      );
      setFeedback(data.feedback);
      setPhase("ended");
    } catch {
      setError("フィードバックを取得できませんでした。もう一度お試しください。");
    } finally {
      setEnding(false);
    }
  }

  function handleRestart() {
    playerRef.current?.remove();
    playerRef.current = null;
    setPhase("idle");
    setSessionId(null);
    setMessages([]);
    setTurnCount(0);
    setFeedback(null);
    setError(null);
    setCustomTopic("");
  }

  if (phase === "idle") {
    return (
      <Card style={{ alignItems: "center", gap: 14 }}>
        <Avatar name={scenario.personaName} size="lg" />
        <Text size={13} color="inkSoft" style={{ textAlign: "center", lineHeight: 19 }}>
          {isFreeTalk
            ? "話したいテーマを下に入力するか、空欄のまま自由に会話を始めましょう。"
            : `${scenario.personaName}さんと英語で会話してみましょう。`}
          会話が終わったら、AIコーチが良かった点・直すと良い表現をフィードバックします。
        </Text>

        {isFreeTalk && (
          <View style={{ gap: 6, alignSelf: "stretch" }}>
            <Text size={12} weight="medium" color="inkSoft">
              話したいテーマ(任意)
            </Text>
            <Input
              value={customTopic}
              onChangeText={(v) => setCustomTopic(v.slice(0, CUSTOM_TOPIC_MAX_LENGTH))}
              placeholder="例: 転職を考えている理由について話したい"
              editable={!starting}
              multiline
            />
          </View>
        )}

        <Text size={11} color="inkFaint" style={{ textAlign: "center" }}>
          このアプリのテキストモードで練習できます。リアルタイム音声通話は近日対応予定です。
        </Text>

        <Button
          label={starting ? "準備中..." : "話し始める"}
          onPress={handleStart}
          loading={starting}
          fullWidth
        />

        {!!error && (
          <Text size={13} color="rose">
            {error}
          </Text>
        )}
      </Card>
    );
  }

  if (phase === "chatting") {
    return (
      <View style={{ borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line, overflow: "hidden" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.lineSoft,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text size={12} color="inkFaint">
            ターン {turnCount} / {MAX_TURNS_PER_SESSION}
          </Text>
          <Pressable onPress={() => setAutoPlay((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={autoPlay ? "volume-high-outline" : "volume-mute-outline"}
              size={16}
              color={theme.colors.inkFaint}
            />
            <Text size={11} color="inkFaint">
              音声を自動再生
            </Text>
          </Pressable>
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          {messages.map((message, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ flex: 1 }}>
                <ChatBubble turn={message} personaName={scenario.personaName} />
              </View>
              {message.role === "assistant" && (
                <Pressable onPress={() => playAudio(index)} hitSlop={8}>
                  <Ionicons name="play-circle-outline" size={20} color={theme.colors.inkFaint} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {turnLimitReached && (
          <Text size={13} weight="medium" color="signal" style={{ paddingHorizontal: 16 }}>
            このセッションの会話上限に達しました。下のボタンでフィードバックを見てみましょう。
          </Text>
        )}
        {!!error && (
          <Text size={13} color="rose" style={{ paddingHorizontal: 16 }}>
            {error}
          </Text>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.lineSoft, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <Input
              value={inputText}
              onChangeText={setInputText}
              placeholder="英語で入力してください"
              editable={!turnLimitReached}
              multiline
              style={{ flex: 1 }}
            />
            <Button
              label={sending ? "..." : "送信"}
              onPress={handleSend}
              disabled={sending || !inputText.trim() || turnLimitReached}
            />
          </View>

          <Button
            label={ending ? "フィードバックを作成中..." : "会話を終えてフィードバックを見る"}
            variant="secondary"
            onPress={handleEnd}
            disabled={turnCount < 1 || ending}
            fullWidth
          />
        </View>
      </View>
    );
  }

  if (phase === "ended" && feedback) {
    return (
      <View style={{ gap: 20 }}>
        <FeedbackPanel feedback={feedback} scenarioTitle={scenario.title} />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Button label="もう一度話す" onPress={handleRestart} />
          <Button label="他のシーンを見る" variant="secondary" onPress={() => router.push("/(tabs)/conversation")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", padding: 24 }}>
      <ActivityIndicator />
    </View>
  );
}
