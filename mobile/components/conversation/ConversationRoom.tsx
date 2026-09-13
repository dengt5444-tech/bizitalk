import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { api, authedAudioSource } from "@/lib/api";
import { CUSTOM_TOPIC_MAX_LENGTH, FREE_TALK_SLUG, MAX_TURNS_PER_SESSION } from "@/lib/conversation";
import type { ConversationFeedback, ConversationTurn } from "@/lib/conversation";
import { connectRealtimeVoice, isRealtimeVoiceSupported, type RealtimeController } from "@/lib/webrtc";
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

type Phase = "idle" | "connecting" | "chatting" | "ended";
type Mode = "realtime" | "text";

export function ConversationRoom({ scenario }: { scenario: ScenarioInfo }) {
  const theme = useTheme();
  const router = useRouter();
  const isFreeTalk = scenario.slug === FREE_TALK_SLUG;
  const supportsRealtime = isRealtimeVoiceSupported();

  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationTurn[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [inputText, setInputText] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const realtimeRef = useRef<RealtimeController | null>(null);
  const transcriptRef = useRef<ConversationTurn[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const openingHandledRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const turnLimitReached = turnCount >= MAX_TURNS_PER_SESSION;

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
      realtimeRef.current?.close();
    };
  }, []);

  function pushTurn(turn: ConversationTurn) {
    const next = [...transcriptRef.current, turn];
    transcriptRef.current = next;
    setMessages(next);
    return next;
  }

  function syncTranscript(transcript: ConversationTurn[], nextTurnCount: number) {
    const id = sessionIdRef.current;
    if (!id) return Promise.resolve();
    return api.patch(`/api/conversation/sessions/${id}/sync-transcript`, {
      transcript,
      turnCount: nextTurnCount,
    }).catch(() => {
      // Best-effort background sync; the next successful sync will catch up.
    });
  }

  function appendRealtimeTurn(role: "user" | "assistant", text: string, itemId?: string) {
    if (!text) return;
    if (itemId) {
      if (processedIdsRef.current.has(itemId)) return;
      processedIdsRef.current.add(itemId);
    }

    let next: ConversationTurn[];
    if (role === "assistant" && !openingHandledRef.current) {
      openingHandledRef.current = true;
      next = [...transcriptRef.current];
      next[0] = { role: "assistant", text };
      transcriptRef.current = next;
      setMessages(next);
    } else {
      next = pushTurn({ role, text });
    }

    const nextTurnCount = Math.max(0, next.filter((m) => m.role === "assistant").length - 1);
    setTurnCount(nextTurnCount);
    syncTranscript(next, nextTurnCount);
    if (nextTurnCount >= MAX_TURNS_PER_SESSION) {
      realtimeRef.current?.disableFurtherInput();
      setMicMuted(true);
    }
  }

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

  async function handleStart(chosenMode: Mode) {
    setStarting(true);
    setError(null);
    setMode(chosenMode);
    openingHandledRef.current = false;
    processedIdsRef.current = new Set();

    try {
      const data = await api.post<{ sessionId: string; transcript: ConversationTurn[] }>(
        "/api/conversation/sessions",
        { scenarioSlug: scenario.slug, ...(isFreeTalk ? { customTopic: customTopic.trim() } : {}) },
      );
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      transcriptRef.current = data.transcript;
      setMessages(data.transcript);
      setTurnCount(0);

      if (chosenMode === "realtime") {
        setPhase("connecting");
        try {
          const tokenData = await api.post<{ clientSecret: string }>(
            `/api/conversation/sessions/${data.sessionId}/realtime-token`,
          );
          const controller = await connectRealtimeVoice(tokenData.clientSecret, scenario.openingLine, {
            onUserSpeakingChange: setUserSpeaking,
            onAssistantSpeakingChange: setAssistantSpeaking,
            onAssistantTurn: (text, itemId) => appendRealtimeTurn("assistant", text, itemId),
            onUserTurn: (text, itemId) => appendRealtimeTurn("user", text, itemId),
            onConnectionUnstable: () => setError("音声接続が不安定になりました。テキストで会話を続けられます。"),
          });
          realtimeRef.current = controller;
          setPhase("chatting");
        } catch {
          realtimeRef.current?.close();
          realtimeRef.current = null;
          setMode("text");
          setError("リアルタイム音声に接続できなかったため、テキストモードで開始します。");
          setPhase("chatting");
          if (autoPlay) setTimeout(() => playAudio(0), 150);
        }
      } else {
        setPhase("chatting");
        if (autoPlay) setTimeout(() => playAudio(0), 150);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "monthly_limit_reached"
          ? "今月のAI会話の利用時間の上限に達しました。月が変わると再びご利用いただけます。"
          : "会話を開始できませんでした。もう一度お試しください。",
      );
      setPhase("idle");
    } finally {
      setStarting(false);
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !sessionId || sending || turnLimitReached) return;

    setInputText("");
    setError(null);

    if (mode === "realtime" && realtimeRef.current) {
      pushTurn({ role: "user", text });
      try {
        realtimeRef.current.sendText(text);
      } catch {
        setError("メッセージを送信できませんでした。もう一度お試しください。");
      }
      return;
    }

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

  function handleMicMuteToggle() {
    const nextMuted = !micMuted;
    realtimeRef.current?.setMuted(nextMuted);
    setMicMuted(nextMuted);
  }

  async function handleEnd() {
    if (!sessionId || ending) return;
    setEnding(true);
    setError(null);
    try {
      if (mode === "realtime") {
        await syncTranscript(transcriptRef.current, turnCount);
        realtimeRef.current?.close();
        realtimeRef.current = null;
      }
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
    realtimeRef.current?.close();
    realtimeRef.current = null;
    transcriptRef.current = [];
    sessionIdRef.current = null;
    setPhase("idle");
    setMode(null);
    setSessionId(null);
    setMessages([]);
    setTurnCount(0);
    setFeedback(null);
    setError(null);
    setCustomTopic("");
    setMicMuted(false);
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

        <View style={{ gap: 10, alignSelf: "stretch" }}>
          {supportsRealtime && (
            <Button
              label={starting ? "準備中..." : "リアルタイム音声で話し始める"}
              onPress={() => handleStart("realtime")}
              loading={starting}
              fullWidth
            />
          )}
          <Button
            label={starting ? "準備中..." : "テキストモードで始める"}
            variant={supportsRealtime ? "secondary" : "primary"}
            onPress={() => handleStart("text")}
            disabled={starting}
            fullWidth
          />
        </View>
        {!supportsRealtime && (
          <Text size={11} color="inkFaint" style={{ textAlign: "center" }}>
            このビルドはリアルタイム音声通話に対応していないため、テキストモードで練習します。
          </Text>
        )}

        {!!error && (
          <Text size={13} color="rose">
            {error}
          </Text>
        )}
      </Card>
    );
  }

  if (phase === "connecting") {
    return (
      <Card style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
        <Avatar name={scenario.personaName} size="lg" />
        <Text weight="medium" color="signal">
          {scenario.personaName}さんに接続しています...
        </Text>
        <Text size={12} color="inkFaint">
          マイクの使用を許可してください。
        </Text>
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
            {mode === "realtime" && assistantSpeaking && (
              <Text size={12} color="signal">
                {" "}話しています...
              </Text>
            )}
            {mode === "realtime" && userSpeaking && (
              <Text size={12} color="amber">
                {" "}聞いています...
              </Text>
            )}
          </Text>
          {mode === "text" && (
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
          )}
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          {messages.map((message, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ flex: 1 }}>
                <ChatBubble turn={message} personaName={scenario.personaName} />
              </View>
              {message.role === "assistant" && mode === "text" && (
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
            {mode === "realtime" && (
              <Pressable
                onPress={handleMicMuteToggle}
                disabled={turnLimitReached}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: micMuted ? theme.colors.roseTint : theme.colors.paperDim,
                  opacity: turnLimitReached ? 0.4 : 1,
                }}
              >
                <Text size={13} weight="medium" color={micMuted ? "rose" : "inkSoft"}>
                  {micMuted ? "ミュート中" : "話す"}
                </Text>
              </Pressable>
            )}
            <Input
              value={inputText}
              onChangeText={setInputText}
              placeholder={mode === "realtime" ? "マイクで話すか、代わりにここに入力できます" : "英語で入力してください"}
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
