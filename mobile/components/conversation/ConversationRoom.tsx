import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Check, Lightbulb, Mic, MicOff, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { HintCard } from "./HintCard";
import { VoiceOrb, type OrbState } from "./VoiceOrb";

type ScenarioInfo = {
  slug: string;
  title: string;
  personaName: string;
  personaRole: string;
  openingLine: string;
};

type Phase = "idle" | "connecting" | "chatting" | "ended";
type Mode = "realtime" | "text";
type Hint = { reply: string; gloss: string };

export function ConversationRoom({
  scenario,
  isFreeTier = false,
}: {
  scenario: ScenarioInfo;
  // True for a signed-in user with no active subscription — the free
  // trial is a one-time grant, so the moment they see their scored
  // feedback is exactly when the paid plans should be pitched.
  isFreeTier?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // "Guided mode": after each of the AI's turns, offer a concrete example
  // of what the learner could say back — chosen on the start screen,
  // works in both realtime voice and text mode.
  const [guidedMode, setGuidedMode] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const playerRef = useRef<AudioPlayer | null>(null);
  const realtimeRef = useRef<RealtimeController | null>(null);
  // Tracks connectRealtimeVoice() while it's still negotiating, i.e. before
  // realtimeRef is assigned. Without this, leaving the screen mid-connect
  // (phase === "connecting") orphans the in-flight RTCPeerConnection and
  // open microphone stream — the unmount cleanup below would find
  // realtimeRef.current still null and close nothing.
  const connectPromiseRef = useRef<Promise<RealtimeController> | null>(null);
  const transcriptRef = useRef<ConversationTurn[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const openingHandledRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const guidedModeRef = useRef(false);

  useEffect(() => {
    guidedModeRef.current = guidedMode;
  }, [guidedMode]);

  const turnLimitReached = turnCount >= MAX_TURNS_PER_SESSION;

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
      if (realtimeRef.current) {
        realtimeRef.current.close();
      } else if (connectPromiseRef.current) {
        connectPromiseRef.current.then((controller) => controller.close()).catch(() => {});
      }
    };
  }, []);

  // If the app is backgrounded mid-call (an incoming phone call, switching
  // apps, screen lock), the OS will most likely suspend the WebRTC session
  // without telling us cleanly. Rather than leaving the screen frozen on a
  // dead connection, end the call explicitly and say so.
  useEffect(() => {
    const inRealtimeCall = mode === "realtime" && (phase === "connecting" || phase === "chatting");
    if (!inRealtimeCall) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") return;
      if (realtimeRef.current) {
        realtimeRef.current.close();
        realtimeRef.current = null;
      } else if (connectPromiseRef.current) {
        connectPromiseRef.current.then((controller) => controller.close()).catch(() => {});
        connectPromiseRef.current = null;
      }
      setPhase("idle");
      setMode(null);
      setError("アプリがバックグラウンドになったため、音声通話を終了しました。もう一度話しかけると再開できます。");
    });

    return () => subscription.remove();
  }, [mode, phase]);

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

  async function fetchHint(transcript: ConversationTurn[]) {
    const id = sessionIdRef.current;
    if (!id || !guidedModeRef.current) return;
    setHintLoading(true);
    try {
      const data = await api.post<Hint>(`/api/conversation/sessions/${id}/hint`, { transcript });
      setHint(data);
    } catch {
      // Silent — the hint card just stays empty/previous; guided mode is a
      // convenience, not something worth interrupting the conversation for.
    } finally {
      setHintLoading(false);
    }
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

    if (role === "user") {
      setHint(null);
    } else {
      fetchHint(next);
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
    setHint(null);
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
      fetchHint(data.transcript);

      if (chosenMode === "realtime") {
        setPhase("connecting");
        try {
          const tokenData = await api.post<{ clientSecret: string }>(
            `/api/conversation/sessions/${data.sessionId}/realtime-token`,
          );
          const connectPromise = connectRealtimeVoice(tokenData.clientSecret, scenario.openingLine, {
            onUserSpeakingChange: setUserSpeaking,
            onAssistantSpeakingChange: setAssistantSpeaking,
            onAssistantTurn: (text, itemId) => appendRealtimeTurn("assistant", text, itemId),
            onUserTurn: (text, itemId) => appendRealtimeTurn("user", text, itemId),
            onConnectionUnstable: () => {
              // A hard ICE failure (not a transient "disconnected", which
              // can self-recover on a brief network blip) — the voice
              // session is unusable. Actually switch to text mode instead
              // of only announcing it: mode must change and realtimeRef
              // must clear, or handleSend keeps routing through the dead
              // data channel.
              realtimeRef.current?.close();
              realtimeRef.current = null;
              setMode("text");
              setError("音声接続が切断されたため、テキストモードに切り替えました。下の入力欄からメッセージを送信できます。");
            },
          });
          connectPromiseRef.current = connectPromise;
          const controller = await connectPromise;
          connectPromiseRef.current = null;
          realtimeRef.current = controller;
          setPhase("chatting");
        } catch {
          connectPromiseRef.current = null;
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
          : code === "free_trial_used"
            ? "無料体験の10分を使い切りました。プランにご登録いただくと、続けて練習できます。"
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
    // In voice mode, this is the type-instead-of-speak fallback — sending
    // while the AI is still talking would fire a second response.create
    // while the first is still actively generating and cut it off. The
    // input is already disabled while assistantSpeaking for this same
    // reason; this is a second guard against enqueued sends beating that.
    if (mode === "realtime" && assistantSpeaking) return;

    setInputText("");
    setError(null);
    setHint(null);

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
    const withUser = [...transcriptRef.current, { role: "user" as const, text }];
    transcriptRef.current = withUser;
    setMessages(withUser);

    try {
      const data = await api.post<{ reply: string; assistantIndex: number; turnCount: number }>(
        `/api/conversation/sessions/${sessionId}/messages`,
        { text },
      );
      const withReply = [...withUser, { role: "assistant" as const, text: data.reply }];
      transcriptRef.current = withReply;
      setMessages(withReply);
      setTurnCount(data.turnCount);
      fetchHint(withReply);
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
    setHint(null);
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

        <Pressable
          onPress={() => setGuidedMode((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            alignSelf: "stretch",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: guidedMode ? theme.colors.signal : theme.colors.line,
            backgroundColor: guidedMode ? theme.colors.signalTint : "transparent",
            paddingVertical: 11,
          }}
        >
          <Lightbulb size={16} color={guidedMode ? theme.colors.signal : theme.colors.inkFaint} strokeWidth={2} />
          <Text size={13} weight="medium" color={guidedMode ? "signal" : "inkSoft"}>
            ガイド付きで練習する
          </Text>
          {guidedMode && <Check size={15} color={theme.colors.signal} strokeWidth={2.5} />}
        </Pressable>
        {guidedMode && (
          <Text size={11} color="inkFaint" style={{ textAlign: "center", marginTop: -6 }}>
            相手が話すたびに「こう言ってみましょう」という返答例が表示されます。
          </Text>
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

  const showVoiceScreen = mode === "realtime" && (phase === "connecting" || phase === "chatting");
  const latestTurn = messages[messages.length - 1];
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

  const voiceScreen = (
    <Modal visible={showVoiceScreen} animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: theme.colors.paper }}>
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar name={scenario.personaName} size="sm" />
            <View>
              <Text weight="semibold" size={14}>
                {scenario.personaName}
              </Text>
              <Text size={11} color="inkFaint">
                ターン {turnCount} / {MAX_TURNS_PER_SESSION}
              </Text>
            </View>
          </View>
          {guidedMode && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: theme.colors.signalTint,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Lightbulb size={13} color={theme.colors.signal} strokeWidth={2} />
              <Text size={11} weight="medium" color="signal">
                ガイド付き
              </Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingHorizontal: 28 }}>
          <VoiceOrb state={orbState} />
          {phase === "connecting" ? (
            <Text weight="medium" color="signal">
              {scenario.personaName}さんに接続しています...
            </Text>
          ) : (
            latestTurn && (
              <View style={{ gap: 6, alignItems: "center" }}>
                <Text size={11} color="inkFaint" eyebrow>
                  {latestTurn.role === "assistant" ? scenario.personaName : "あなた"}
                </Text>
                <Text size={17} weight="medium" style={{ textAlign: "center", lineHeight: 24 }}>
                  {latestTurn.text}
                </Text>
              </View>
            )
          )}
        </View>

        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {guidedMode && phase === "chatting" && (hint || hintLoading) && (
            <HintCard
              reply={hint?.reply ?? null}
              gloss={hint?.gloss ?? null}
              loading={hintLoading}
              onRefresh={() => fetchHint(transcriptRef.current)}
            />
          )}
          {turnLimitReached && (
            <Text size={13} weight="medium" color="signal" style={{ textAlign: "center" }}>
              このセッションの会話上限に達しました。下のボタンでフィードバックを見てみましょう。
            </Text>
          )}
          {!!error && (
            <Text size={13} color="rose" style={{ textAlign: "center" }}>
              {error}
            </Text>
          )}
        </View>

        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Input
            value={inputText}
            onChangeText={setInputText}
            placeholder="マイクで話すか、代わりにここに入力できます"
            editable={!turnLimitReached && !assistantSpeaking}
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={handleMicMuteToggle}
            disabled={turnLimitReached || phase !== "chatting"}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: micMuted ? theme.colors.roseTint : theme.colors.paperDim,
              opacity: turnLimitReached || phase !== "chatting" ? 0.4 : 1,
            }}
          >
            {micMuted ? (
              <MicOff size={20} color={theme.colors.rose} strokeWidth={2} />
            ) : (
              <Mic size={20} color={theme.colors.inkSoft} strokeWidth={2} />
            )}
          </Pressable>
          <Pressable
            onPress={handleEnd}
            disabled={ending || turnCount < 1}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.ink,
              opacity: ending || turnCount < 1 ? 0.4 : 1,
            }}
          >
            {ending ? <ActivityIndicator size="small" color={theme.colors.paper} /> : <X size={20} color={theme.colors.paper} strokeWidth={2} />}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  if (phase === "connecting" || (phase === "chatting" && mode === "realtime")) {
    return voiceScreen;
  }

  if (phase === "chatting" && mode === "text") {
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

        {guidedMode && (hint || hintLoading) && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <HintCard
              reply={hint?.reply ?? null}
              gloss={hint?.gloss ?? null}
              loading={hintLoading}
              onRefresh={() => fetchHint(transcriptRef.current)}
            />
          </View>
        )}

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
        {isFreeTier && (
          <Card style={{ alignItems: "center", gap: 8, paddingVertical: 20, backgroundColor: theme.colors.signalTint }}>
            <Text weight="semibold" style={{ textAlign: "center" }}>
              無料体験はここまでです
            </Text>
            <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
              プランにご登録いただくと、他のシーンも含めてもっと練習を続けられます。
            </Text>
            <Button label="料金プランを見る" onPress={() => router.push("/(tabs)/mypage")} />
          </Card>
        )}
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
