import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, Lightbulb, Mic, MicOff, Send, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { Button, Card, Text } from "@/components/ui";
import { api, ApiError, apiUrl, authHeaders } from "@/lib/api";
import {
  CUSTOM_TOPIC_MAX_LENGTH,
  FREE_TALK_SLUG,
  MAX_TURNS_PER_SESSION,
  SUGGESTED_FEEDBACK_TURN,
  type ConversationFeedback,
  type ConversationTurn,
} from "@/lib/conversation";
import {
  RealtimeVoiceBridge,
  type BridgeEvent,
  type RealtimeVoiceBridgeHandle,
} from "@/lib/realtime/RealtimeVoiceBridge";
import { radius, useColors } from "@/theme";
import { ChatBubble } from "./ChatBubble";
import { FeedbackPanel } from "./FeedbackPanel";
import { HintCard } from "./HintCard";
import { VoiceOrb, type OrbState } from "./VoiceOrb";

export type ScenarioInfo = {
  slug: string;
  title: string;
  personaName: string;
  personaRole: string;
};

type Phase = "idle" | "connecting" | "chatting" | "ended";
type Mode = "realtime" | "text";
type Hint = { reply: string; gloss: string };

// How long to wait for the voice connection before falling back to text.
const CONNECT_TIMEOUT_MS = 20000;

// Port of the web app's ConversationRoom.tsx: same API calls, same session
// lifecycle, same turn counting and guided-mode hints. The realtime voice
// protocol itself runs inside RealtimeVoiceBridge (a hidden WebView); this
// component owns everything around it.
export function ConversationRoom({ scenario }: { scenario: ScenarioInfo }) {
  const colors = useColors();
  const isFreeTalk = scenario.slug === FREE_TALK_SLUG;

  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode | null>(null);
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
  const [guidedMode, setGuidedMode] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [bridgeMounted, setBridgeMounted] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<ConversationTurn[]>([]);
  const openingHandledRef = useRef(false);
  const openingLineRef = useRef("");
  const guidedModeRef = useRef(false);
  const hintRequestIdRef = useRef(0);
  const assistantSpeakingRef = useRef(false);
  const bridgeRef = useRef<RealtimeVoiceBridgeHandle>(null);
  const tokenPromiseRef = useRef<Promise<{ clientSecret: string }> | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const scrollRef = useRef<ScrollView>(null);

  const player = useAudioPlayer(null);

  useEffect(() => {
    guidedModeRef.current = guidedMode;
  }, [guidedMode]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    };
  }, []);

  const turnLimitReached = turnCount >= MAX_TURNS_PER_SESSION;
  const feedbackSuggested = turnCount >= SUGGESTED_FEEDBACK_TURN;

  function pushTurn(turn: ConversationTurn) {
    const next = [...transcriptRef.current, turn];
    transcriptRef.current = next;
    setMessages(next);
    return next;
  }

  function syncTranscript(transcript: ConversationTurn[], nextTurnCount: number) {
    const id = sessionIdRef.current;
    if (!id) return Promise.resolve();
    return api
      .patch(`/api/conversation/sessions/${id}/sync-transcript`, { transcript, turnCount: nextTurnCount })
      .catch(() => {
        // Best-effort background sync; the next successful sync catches up.
      });
  }

  async function fetchHint(transcript: ConversationTurn[]) {
    const id = sessionIdRef.current;
    if (!id) return;
    const requestId = ++hintRequestIdRef.current;
    setHintLoading(true);
    try {
      const data = await api.post<Hint>(`/api/conversation/sessions/${id}/hint`, { transcript });
      // A newer request (or the learner already replying) supersedes this one.
      if (requestId !== hintRequestIdRef.current) return;
      setHint({ reply: data.reply, gloss: data.gloss });
    } catch {
      // Guided mode is a convenience — never interrupt the conversation for it.
    } finally {
      if (requestId === hintRequestIdRef.current) setHintLoading(false);
    }
  }

  function autoFetchHint(transcript: ConversationTurn[]) {
    if (guidedModeRef.current) fetchHint(transcript);
  }

  function clearHint() {
    hintRequestIdRef.current += 1;
    setHint(null);
    setHintLoading(false);
  }

  async function playAudio(index: number) {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      player.replace({ uri: apiUrl(`/api/conversation/sessions/${id}/audio/${index}`), headers: await authHeaders() });
      player.play();
    } catch {
      // The per-message replay button still lets the learner try again.
    }
  }

  // ── Realtime voice ────────────────────────────────────────────────────

  function stopBridge() {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    bridgeRef.current?.send({ type: "stop" });
    setBridgeMounted(false);
    assistantSpeakingRef.current = false;
    setAssistantSpeaking(false);
    setUserSpeaking(false);
  }

  function fallBackToText(message: string) {
    stopBridge();
    setMode("text");
    setError(message);
    setPhase("chatting");
    if (autoPlay) playAudio(0);
  }

  function appendRealtimeTurn(role: "user" | "assistant", text: string) {
    if (!text) return;
    let next: ConversationTurn[];
    if (role === "assistant" && !openingHandledRef.current) {
      // The seeded opening line is already on screen; the AI speaking it
      // replaces that placeholder rather than adding a second copy.
      openingHandledRef.current = true;
      next = [...transcriptRef.current];
      next[0] = { role: "assistant", text };
      transcriptRef.current = next;
      setMessages(next);
    } else {
      next = pushTurn({ role, text });
    }

    // The seeded opening line isn't counted as a turn.
    const nextTurnCount = Math.max(0, next.filter((m) => m.role === "assistant").length - 1);
    setTurnCount(nextTurnCount);
    syncTranscript(next, nextTurnCount);
    if (role === "user") clearHint();
    else autoFetchHint(next);

    if (nextTurnCount >= MAX_TURNS_PER_SESSION) {
      setMicMuted(true);
      bridgeRef.current?.send({ type: "disableTurnDetection" });
    }
  }

  async function answerOffer(sdp: string) {
    try {
      const token = await tokenPromiseRef.current;
      if (!token) throw new Error("token_failed");
      const res = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: sdp,
        headers: { Authorization: `Bearer ${token.clientSecret}`, "Content-Type": "application/sdp" },
      });
      if (!res.ok) throw new Error("sdp_exchange_failed");
      bridgeRef.current?.send({ type: "answer", sdp: await res.text() });
    } catch {
      fallBackToText("リアルタイム音声に接続できなかったため、テキストモードで開始します。");
    }
  }

  function handleBridgeEvent(event: BridgeEvent) {
    switch (event.type) {
      case "ready":
        bridgeRef.current?.send({ type: "start", openingLine: openingLineRef.current });
        break;
      case "offer":
        answerOffer(event.sdp);
        break;
      case "micError":
        fallBackToText("マイクを使用できなかったため、テキストモードで開始します。");
        break;
      case "connected":
        if (connectTimerRef.current) {
          clearTimeout(connectTimerRef.current);
          connectTimerRef.current = null;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setPhase("chatting");
        break;
      case "turn":
        appendRealtimeTurn(event.role, event.text);
        break;
      case "assistantSpeaking":
        assistantSpeakingRef.current = event.value;
        setAssistantSpeaking(event.value);
        break;
      case "userSpeaking":
        setUserSpeaking(event.value);
        break;
      case "iceUnstable":
        setError("音声接続が不安定になりました。テキストで会話を続けられます。");
        break;
      case "error":
        if (phaseRef.current === "connecting") {
          fallBackToText("リアルタイム音声に接続できなかったため、テキストモードで開始します。");
        } else {
          setError("メッセージを送信できませんでした。もう一度お試しください。");
        }
        break;
      case "log":
        if (__DEV__) console.log("[realtime]", event.message, event.data ?? "");
        break;
    }
  }

  // ── Session lifecycle ─────────────────────────────────────────────────

  async function handleStart(chosenMode: Mode) {
    setStarting(true);
    setError(null);
    clearHint();
    openingHandledRef.current = false;

    if (chosenMode === "realtime") {
      const permission = await requestRecordingPermissionsAsync().catch(() => null);
      if (!permission?.granted) {
        setError(
          "マイクへのアクセスが許可されていません。「設定」アプリでビジトークのマイクを許可するか、テキストモードで始めてください。",
        );
        setStarting(false);
        return;
      }
    }

    try {
      const data = await api.post<{ sessionId: string; transcript: ConversationTurn[] }>(
        "/api/conversation/sessions",
        { scenarioSlug: scenario.slug, ...(isFreeTalk ? { customTopic: customTopic.trim() } : {}) },
      );

      sessionIdRef.current = data.sessionId;
      transcriptRef.current = data.transcript;
      openingLineRef.current = data.transcript[0]?.text ?? "";
      setMessages(data.transcript);
      setTurnCount(0);
      setMicMuted(false);
      setMode(chosenMode);
      autoFetchHint(data.transcript);

      if (chosenMode === "realtime") {
        setPhase("connecting");
        // Requested now, in parallel with the WebView spinning up and the
        // microphone initializing — whichever is slowest sets the wait.
        const tokenPromise = api.post<{ clientSecret: string }>(
          `/api/conversation/sessions/${data.sessionId}/realtime-token`,
        );
        tokenPromise.catch(() => {});
        tokenPromiseRef.current = tokenPromise;
        setBridgeMounted(true);
        connectTimerRef.current = setTimeout(() => {
          if (phaseRef.current === "connecting") {
            fallBackToText("リアルタイム音声に接続できなかったため、テキストモードで開始します。");
          }
        }, CONNECT_TIMEOUT_MS);
      } else {
        setPhase("chatting");
        if (autoPlay) playAudio(0);
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "monthly_limit_reached"
          ? "今月のAI会話の利用時間の上限に達しました。月が変わると再びご利用いただけます。料金プランから上限を増やすこともできます。"
          : "会話を開始できませんでした。もう一度お試しください。",
      );
      setPhase("idle");
    } finally {
      setStarting(false);
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    const id = sessionIdRef.current;
    if (!text || !id || sending || turnLimitReached) return;
    // Typing while the AI is still talking would cut its reply off.
    if (mode === "realtime" && assistantSpeakingRef.current) return;

    setInputText("");
    setError(null);
    clearHint();

    if (mode === "realtime" && bridgeMounted) {
      pushTurn({ role: "user", text });
      bridgeRef.current?.send({ type: "sendText", text });
      return;
    }

    setSending(true);
    pushTurn({ role: "user", text });
    try {
      const data = await api.post<{ reply: string; assistantIndex: number; turnCount: number }>(
        `/api/conversation/sessions/${id}/messages`,
        { text },
      );
      const next = pushTurn({ role: "assistant", text: data.reply });
      setTurnCount(data.turnCount);
      autoFetchHint(next);
      if (autoPlay) playAudio(data.assistantIndex);
    } catch {
      setError("メッセージを送信できませんでした。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  function handleMicMuteToggle() {
    const next = !micMuted;
    setMicMuted(next);
    bridgeRef.current?.send({ type: "setMuted", muted: next });
    Haptics.selectionAsync().catch(() => {});
  }

  async function handleEnd() {
    const id = sessionIdRef.current;
    if (!id || ending) return;
    setEnding(true);
    setError(null);
    const wasRealtime = mode === "realtime";
    stopBridge();
    player.pause();
    try {
      // Realtime turns are synced in the background as they happen; make
      // sure the last one has landed before the server reads it back.
      if (wasRealtime) await syncTranscript(transcriptRef.current, turnCount);
      const data = await api.post<{ feedback: ConversationFeedback | null }>(
        `/api/conversation/sessions/${id}/end`,
      );
      if (!data.feedback) {
        // Left before saying anything: nothing to give feedback on.
        handleRestart();
        router.back();
        return;
      }
      setFeedback(data.feedback);
      setPhase("ended");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setError("フィードバックを取得できませんでした。もう一度お試しください。");
    } finally {
      setEnding(false);
    }
  }

  function confirmEnd() {
    if (turnCount < 1) {
      handleEnd();
      return;
    }
    Alert.alert("会話を終了しますか?", "終了すると、AIコーチからのフィードバックが表示されます。", [
      { text: "続ける", style: "cancel" },
      { text: "終了する", style: "destructive", onPress: handleEnd },
    ]);
  }

  function handleRestart() {
    stopBridge();
    openingHandledRef.current = false;
    transcriptRef.current = [];
    sessionIdRef.current = null;
    setPhase("idle");
    setMode(null);
    setMessages([]);
    setTurnCount(0);
    setFeedback(null);
    setError(null);
    setMicMuted(false);
    clearHint();
  }

  const roomOpen = (phase === "connecting" || phase === "chatting") && mode !== null;
  const orbState: OrbState = turnLimitReached
    ? "muted"
    : phase === "connecting"
      ? "connecting"
      : micMuted
        ? "muted"
        : assistantSpeaking
          ? "assistant"
          : userSpeaking
            ? "user"
            : "idle";

  // ── Render ────────────────────────────────────────────────────────────

  if (phase === "ended" && feedback) {
    return (
      <Card style={{ gap: 24 }}>
        <FeedbackPanel feedback={feedback} scenarioTitle={scenario.title} />
        <View style={{ gap: 10 }}>
          <Button title="もう一度話す" onPress={handleRestart} />
          <Button title="他のシーンを見る" variant="outline" onPress={() => router.navigate("/conversation")} />
        </View>
      </Card>
    );
  }

  const endLabel = ending ? "処理中..." : turnCount < 1 ? "退室する" : "会話を終えてフィードバックを見る";

  return (
    <>
      <Card style={{ alignItems: "center", gap: 16 }}>
        <Avatar name={scenario.personaName} size="lg" />
        <Text variant="small" center>
          {isFreeTalk
            ? "話したいテーマを下に入力するか、空欄のまま自由に会話を始めましょう。"
            : `${scenario.personaName}さんと英語で会話してみましょう。`}
          会話が終わったら、AIコーチが良かった点・直すと良い表現をフィードバックします。
        </Text>

        {isFreeTalk && (
          <View style={{ alignSelf: "stretch", gap: 6 }}>
            <Text variant="caption" tone="inkSoft" weight="600">
              話したいテーマ(任意)
            </Text>
            <TextInput
              value={customTopic}
              onChangeText={(value) => setCustomTopic(value.slice(0, CUSTOM_TOPIC_MAX_LENGTH))}
              editable={!starting}
              placeholder="例: 転職を考えている理由について話したい / 最近読んだビジネス書について / 特になし"
              placeholderTextColor={colors.inkFaint}
              multiline
              style={[styles.topicInput, { borderColor: colors.line, backgroundColor: colors.paper, color: colors.ink }]}
            />
          </View>
        )}

        <Pressable
          onPress={() => setGuidedMode((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: guidedMode }}
          style={[
            styles.guidedToggle,
            {
              borderColor: guidedMode ? colors.signal : colors.line,
              backgroundColor: guidedMode ? colors.signalTint : "transparent",
            },
          ]}
        >
          <Lightbulb size={16} color={guidedMode ? colors.signalDim : colors.inkSoft} />
          <Text variant="small" weight="600" style={{ color: guidedMode ? colors.signalDim : colors.inkSoft }}>
            毎回ヒントを自動表示する
          </Text>
          {guidedMode && <Check size={15} color={colors.signalDim} />}
        </Pressable>
        <Text variant="caption" center>
          {guidedMode
            ? "相手が話すたびに「こう言ってみましょう」という返答例が表示されます。"
            : "オフでも、会話中いつでもヒントボタンから返答例を呼び出せます。"}
        </Text>

        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button
            title={starting ? "準備中..." : "リアルタイム音声で話し始める"}
            size="lg"
            icon={<Mic size={18} color={colors.onSignal} />}
            loading={starting && mode !== "text"}
            disabled={starting}
            onPress={() => handleStart("realtime")}
          />
          <Button title="テキストモードで始める" variant="ghost" disabled={starting} onPress={() => handleStart("text")} />
        </View>
        {error && phase === "idle" && (
          <Text variant="small" tone="rose" center>
            {error}
          </Text>
        )}
      </Card>

      <Modal visible={roomOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={confirmEnd}>
        <SafeAreaView style={[styles.room, { backgroundColor: colors.paper }]} edges={["top", "bottom"]}>
          {bridgeMounted && <RealtimeVoiceBridge ref={bridgeRef} onEvent={handleBridgeEvent} />}

          <View style={[styles.roomHeader, { borderBottomColor: colors.lineSoft }]}>
            <Avatar name={scenario.personaName} size="sm" />
            <View style={{ flex: 1 }}>
              <Text variant="heading" style={{ fontSize: 15 }} numberOfLines={1}>
                {scenario.personaName}
              </Text>
              <Text variant="caption">ターン {turnCount}</Text>
            </View>
            {guidedMode && (
              <View style={[styles.guidedPill, { backgroundColor: colors.signalTint }]}>
                <Lightbulb size={13} color={colors.signalDim} />
                <Text variant="caption" weight="600" style={{ color: colors.signalDim }}>
                  ガイド付き
                </Text>
              </View>
            )}
            {mode === "text" && (
              <View style={styles.autoPlay}>
                <Text variant="caption">音声を自動再生</Text>
                <Switch
                  value={autoPlay}
                  onValueChange={setAutoPlay}
                  trackColor={{ true: colors.signal }}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
            )}
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {mode === "realtime" && (
              <View style={styles.orbArea}>
                <VoiceOrb state={orbState} />
                <Text variant="small" tone={phase === "connecting" ? "signal" : "inkFaint"} weight="600">
                  {phase === "connecting"
                    ? `${scenario.personaName}さんに接続しています...`
                    : micMuted
                      ? "マイクはミュート中です"
                      : assistantSpeaking
                        ? `${scenario.personaName}さんが話しています`
                        : userSpeaking
                          ? "聞いています..."
                          : "話しかけてください"}
                </Text>
              </View>
            )}

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.transcript}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message, index) => (
                <ChatBubble
                  key={index}
                  role={message.role}
                  text={message.text}
                  personaName={scenario.personaName}
                  onPlay={mode === "text" && message.role === "assistant" ? () => playAudio(index) : undefined}
                />
              ))}
              {sending && (
                <View style={{ paddingLeft: 44 }}>
                  <ActivityIndicator color={colors.inkFaint} />
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              {phase === "chatting" && (hint || hintLoading) && (
                <HintCard
                  reply={hint?.reply ?? null}
                  gloss={hint?.gloss ?? null}
                  loading={hintLoading}
                  onRefresh={() => fetchHint(transcriptRef.current)}
                />
              )}
              {turnLimitReached ? (
                <Text variant="small" tone="signal" weight="600" center>
                  長い会話になりました。会話を終えてフィードバックを見てみましょう。
                </Text>
              ) : (
                feedbackSuggested &&
                phase === "chatting" && (
                  <Text variant="small" center>
                    十分に話せていますね。もう少し続けても、いつでもフィードバックを見てもOKです。
                  </Text>
                )
              )}
              {error && (
                <Text variant="small" tone="rose" center>
                  {error}
                </Text>
              )}

              <View style={styles.inputRow}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!turnLimitReached && phase === "chatting" && !(mode === "realtime" && assistantSpeaking)}
                  placeholder={mode === "realtime" ? "マイクで話すか、代わりにここに入力できます" : "英語で入力してください"}
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="sentences"
                  style={[styles.input, { borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink }]}
                />
                {inputText.trim().length > 0 ? (
                  <RoundButton
                    label="送信"
                    onPress={handleSend}
                    disabled={sending || turnLimitReached}
                    background={colors.signal}
                  >
                    <Send size={18} color={colors.onSignal} />
                  </RoundButton>
                ) : null}
                <RoundButton
                  label="ヒントを見る"
                  onPress={() => fetchHint(transcriptRef.current)}
                  disabled={hintLoading || turnLimitReached || phase !== "chatting"}
                  background={colors.paperDim}
                >
                  <Lightbulb size={19} color={colors.inkSoft} />
                </RoundButton>
                {mode === "realtime" && (
                  <RoundButton
                    label={micMuted ? "マイクのミュートを解除" : "マイクをミュート"}
                    onPress={handleMicMuteToggle}
                    disabled={turnLimitReached || phase !== "chatting"}
                    background={micMuted ? colors.roseTint : colors.paperDim}
                  >
                    {micMuted ? <MicOff size={19} color={colors.rose} /> : <Mic size={19} color={colors.inkSoft} />}
                  </RoundButton>
                )}
              </View>

              <Button
                title={endLabel}
                variant={turnCount < 1 ? "outline" : "primary"}
                icon={turnCount < 1 ? <X size={16} color={colors.ink} /> : undefined}
                loading={ending}
                onPress={confirmEnd}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function RoundButton({
  label,
  onPress,
  disabled,
  background,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  background: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topicInput: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  guidedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  room: { flex: 1 },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  guidedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  autoPlay: { flexDirection: "row", alignItems: "center", gap: 2 },
  orbArea: { alignItems: "center", paddingTop: 8, gap: 4 },
  transcript: { padding: 18, gap: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 6, gap: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, height: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 16, fontSize: 14.5 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
