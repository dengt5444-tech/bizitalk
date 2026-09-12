"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type {
  ConversationFeedback,
  ConversationTurn,
} from "@/lib/conversation";
import {
  CUSTOM_TOPIC_MAX_LENGTH,
  FREE_TALK_SLUG,
  MAX_TURNS_PER_SESSION,
} from "@/lib/conversation";
import { Avatar } from "@/components/Avatar";
import { FeedbackPanel } from "@/components/FeedbackPanel";

type ScenarioInfo = {
  slug: string;
  title: string;
  personaName: string;
  personaRole: string;
  openingLine: string;
};

type Phase = "idle" | "connecting" | "chatting" | "ended";
type Mode = "realtime" | "text";

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultItem {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser feature checks can only run after mount (the server doesn't know
// what the visitor's browser supports), so these are read through
// useSyncExternalStore: it renders the server-safe snapshot (false) for the
// initial/SSR pass and only switches to the real client value once mounted,
// avoiding a hydration mismatch between server and client markup.
function noopSubscribe() {
  return () => {};
}
function getSpeechSupportedSnapshot() {
  return !!getSpeechRecognitionConstructor();
}
function getSpeechSupportedServerSnapshot() {
  return false;
}
function getRealtimeSupportedSnapshot() {
  return typeof RTCPeerConnection !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
function getRealtimeSupportedServerSnapshot() {
  return false;
}

interface RealtimeItemContentPart {
  type?: string;
  text?: string;
  transcript?: string;
}
interface RealtimeConversationItem {
  id?: string;
  role?: string;
  content?: RealtimeItemContentPart[];
}
interface RealtimeServerEvent {
  type: string;
  transcript?: string;
  item_id?: string;
  item?: RealtimeConversationItem;
  [key: string]: unknown;
}

function extractItemText(item: RealtimeConversationItem): string {
  for (const part of item.content ?? []) {
    if (typeof part.transcript === "string" && part.transcript.trim()) {
      return part.transcript.trim();
    }
    if (typeof part.text === "string" && part.text.trim()) {
      return part.text.trim();
    }
  }
  return "";
}

export function ConversationRoom({ scenario }: { scenario: ScenarioInfo }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationTurn[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [inputText, setInputText] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const isFreeTalk = scenario.slug === FREE_TALK_SLUG;
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechSupported = useSyncExternalStore(
    noopSubscribe,
    getSpeechSupportedSnapshot,
    getSpeechSupportedServerSnapshot,
  );

  const transcriptRef = useRef<ConversationTurn[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  // The session is created with a seeded opening-line message already shown
  // on screen (so it renders instantly, without waiting on the model). The
  // realtime API is then asked to actually speak that same line; this flag
  // makes the first assistant turn it produces replace that placeholder
  // instead of appending a duplicate second copy of the opening line.
  const openingHandledRef = useRef(false);

  const supportsRealtime = useSyncExternalStore(
    noopSubscribe,
    getRealtimeSupportedSnapshot,
    getRealtimeSupportedServerSnapshot,
  );

  const turnLimitReached = turnCount >= MAX_TURNS_PER_SESSION;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      closeRealtimeConnection();
    };
  }, []);

  function closeRealtimeConnection() {
    try {
      dcRef.current?.close();
    } catch {
      // connection may already be gone
    }
    try {
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {
      // ignore
    }
    try {
      pcRef.current?.close();
    } catch {
      // ignore
    }
    dcRef.current = null;
    pcRef.current = null;
    micStreamRef.current = null;
  }

  function pushTurn(turn: ConversationTurn) {
    const next = [...transcriptRef.current, turn];
    transcriptRef.current = next;
    setMessages(next);
    return next;
  }

  function syncTranscript(transcript: ConversationTurn[], nextTurnCount: number) {
    if (!sessionId) return Promise.resolve();
    return fetch(`/api/conversation/sessions/${sessionId}/sync-transcript`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, turnCount: nextTurnCount }),
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

    // The seeded opening line (index 0) is display-only and isn't counted
    // as a turn in text mode either, so subtract it back out here.
    const nextTurnCount = Math.max(
      0,
      next.filter((m) => m.role === "assistant").length - 1,
    );
    setTurnCount(nextTurnCount);
    syncTranscript(next, nextTurnCount);
    if (nextTurnCount >= MAX_TURNS_PER_SESSION) {
      muteMic();
      try {
        dcRef.current?.send(
          JSON.stringify({
            type: "session.update",
            session: { type: "realtime", audio: { input: { turn_detection: null } } },
          }),
        );
      } catch {
        // ignore, the UI already disables further input
      }
    }
  }

  function muteMic() {
    micStreamRef.current?.getTracks().forEach((track) => (track.enabled = false));
    setMicMuted(true);
  }

  function handleMicMuteToggle() {
    const nextMuted = !micMuted;
    micStreamRef.current?.getTracks().forEach((track) => (track.enabled = !nextMuted));
    setMicMuted(nextMuted);
  }

  function playAudio(index: number) {
    if (!sessionId || !audioRef.current) return;
    audioRef.current.srcObject = null;
    audioRef.current.src = `/api/conversation/sessions/${sessionId}/audio/${index}`;
    audioRef.current.play().catch(() => {
      // Autoplay can be blocked by the browser; the per-message replay
      // button still lets the learner play it manually.
    });
  }

  async function connectRealtime(id: string) {
    const tokenRes = await fetch(`/api/conversation/sessions/${id}/realtime-token`, {
      method: "POST",
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData?.error ?? "token_failed");

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (audioRef.current) {
        audioRef.current.src = "";
        audioRef.current.srcObject = event.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };

    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = micStream;
    micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;

    dc.onmessage = (event) => {
      let msg: RealtimeServerEvent;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "input_audio_buffer.speech_started":
          setUserSpeaking(true);
          break;
        case "input_audio_buffer.speech_stopped":
          setUserSpeaking(false);
          break;
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
          setAssistantSpeaking(true);
          break;
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
          setAssistantSpeaking(false);
          if (typeof msg.transcript === "string") {
            appendRealtimeTurn("assistant", msg.transcript.trim(), msg.item_id);
          }
          break;
        case "conversation.item.input_audio_transcription.completed":
          if (typeof msg.transcript === "string") {
            appendRealtimeTurn("user", msg.transcript.trim(), msg.item_id);
          }
          break;
        case "conversation.item.done":
          // Fallback in case the dedicated transcript-done event above
          // isn't recognized; item ids keep this from double-adding.
          if (msg.item?.role === "assistant") {
            appendRealtimeTurn("assistant", extractItemText(msg.item), msg.item?.id);
          }
          break;
        case "error":
          console.error("realtime session error", msg);
          break;
        default:
          break;
      }
    };

    dc.onopen = () => {
      try {
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions: `Say this exact line out loud as your opening, naturally, with nothing added before or after it: "${scenario.openingLine}"`,
            },
          }),
        );
      } catch {
        // ignore
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setError("音声接続が不安定になりました。テキストで会話を続けられます。");
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${tokenData.clientSecret}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpRes.ok) throw new Error("sdp_exchange_failed");

    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  async function handleStart(chosenMode: Mode) {
    setStarting(true);
    setError(null);
    setMode(chosenMode);
    openingHandledRef.current = false;
    try {
      const res = await fetch("/api/conversation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioSlug: scenario.slug,
          ...(isFreeTalk ? { customTopic: customTopic.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "start_failed");

      setSessionId(data.sessionId);
      transcriptRef.current = data.transcript;
      setMessages(data.transcript);
      setTurnCount(0);

      if (chosenMode === "realtime") {
        setPhase("connecting");
        try {
          await connectRealtime(data.sessionId);
          setPhase("chatting");
        } catch {
          closeRealtimeConnection();
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

    if (mode === "realtime" && dcRef.current?.readyState === "open") {
      pushTurn({ role: "user", text });
      try {
        dcRef.current.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
          }),
        );
        dcRef.current.send(JSON.stringify({ type: "response.create" }));
      } catch {
        setError("メッセージを送信できませんでした。もう一度お試しください。");
      }
      return;
    }

    setSending(true);
    pushTurn({ role: "user", text });

    try {
      const res = await fetch(`/api/conversation/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "send_failed");

      pushTurn({ role: "assistant", text: data.reply });
      setTurnCount(data.turnCount);
      if (autoPlay) {
        setTimeout(() => playAudio(data.assistantIndex), 150);
      }
    } catch {
      setError("メッセージを送信できませんでした。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  function handleMicToggle() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputText(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  async function handleEnd() {
    if (!sessionId || ending) return;
    setEnding(true);
    setError(null);
    closeRealtimeConnection();
    try {
      // Turns from realtime mode are synced to the server in the background
      // (fire-and-forget) as they happen, so the last one may still be in
      // flight. Flush it and wait for it to land before asking the feedback
      // endpoint to read the transcript back, or it can see a stale
      // turn_count and refuse ("not enough turns") even though the
      // conversation just happened.
      if (mode === "realtime") {
        await syncTranscript(transcriptRef.current, turnCount);
      }
      const res = await fetch(`/api/conversation/sessions/${sessionId}/end`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "end_failed");

      setFeedback(data.feedback);
      setPhase("ended");
    } catch {
      setError("フィードバックを取得できませんでした。もう一度お試しください。");
    } finally {
      setEnding(false);
    }
  }

  function handleRestart() {
    closeRealtimeConnection();
    processedIdsRef.current = new Set();
    openingHandledRef.current = false;
    transcriptRef.current = [];
    setPhase("idle");
    setMode(null);
    setSessionId(null);
    setMessages([]);
    setTurnCount(0);
    setFeedback(null);
    setError(null);
    setMicMuted(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <audio ref={audioRef} autoPlay className="hidden" />

      {phase === "idle" && (
        <div className="p-6 text-center sm:p-8">
          <Avatar name={scenario.personaName} size="lg" className="mx-auto" />
          <p className="mt-4 text-sm text-ink-soft">
            {isFreeTalk
              ? "話したいテーマを下に入力するか、空欄のまま自由に会話を始めましょう。"
              : `${scenario.personaName}さんと英語で会話してみましょう。`}
            会話が終わったら、AIコーチが良かった点・直すと良い表現をフィードバックします。
          </p>
          {isFreeTalk && (
            <div className="mx-auto mt-5 max-w-sm text-left">
              <label
                htmlFor="free-talk-topic"
                className="text-xs font-medium text-ink-soft"
              >
                話したいテーマ(任意)
              </label>
              <textarea
                id="free-talk-topic"
                value={customTopic}
                onChange={(event) =>
                  setCustomTopic(event.target.value.slice(0, CUSTOM_TOPIC_MAX_LENGTH))
                }
                disabled={starting}
                placeholder="例: 転職を考えている理由について話したい / 最近読んだビジネス書について / 特になし"
                rows={2}
                className="mt-1.5 w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          )}
          <div className="mt-6 flex flex-col items-center gap-3">
            {supportsRealtime && (
              <button
                type="button"
                onClick={() => handleStart("realtime")}
                disabled={starting}
                className="rounded-full bg-signal px-8 py-3.5 text-base font-medium text-paper transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? "準備中..." : "リアルタイム音声で話し始める"}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleStart("text")}
              disabled={starting}
              className={
                supportsRealtime
                  ? "text-sm font-medium text-ink-soft underline decoration-line underline-offset-4 transition hover:text-signal hover:decoration-signal disabled:cursor-not-allowed disabled:opacity-60"
                  : "rounded-full bg-signal px-8 py-3.5 text-base font-medium text-paper transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              {supportsRealtime
                ? "テキストモードで始める"
                : starting
                  ? "準備中..."
                  : "話し始める"}
            </button>
            {!supportsRealtime && (
              <p className="text-xs text-ink-faint">
                お使いのブラウザはリアルタイム音声に対応していないため、テキストモードで練習します。
              </p>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        </div>
      )}

      {phase === "connecting" && (
        <div className="p-6 text-center sm:p-8">
          <Avatar name={scenario.personaName} size="lg" className="mx-auto animate-pulse" />
          <p className="mt-4 text-sm font-medium text-signal">
            {scenario.personaName}さんに接続しています...
          </p>
          <p className="mt-2 text-xs text-ink-faint">
            マイクの使用を許可してください。
          </p>
        </div>
      )}

      {phase === "chatting" && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
            <p className="text-xs font-medium text-ink-faint">
              ターン {turnCount} / {MAX_TURNS_PER_SESSION}
              {mode === "realtime" && assistantSpeaking && (
                <span className="ml-2 text-signal">話しています...</span>
              )}
              {mode === "realtime" && userSpeaking && (
                <span className="ml-2 text-amber">聞いています...</span>
              )}
            </p>
            {mode === "text" && (
              <label className="flex items-center gap-1.5 text-xs text-ink-faint">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  className="rounded accent-signal"
                />
                音声を自動再生
              </label>
            )}
          </div>

          <div className="max-h-[28rem] space-y-3 overflow-y-auto px-5 py-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar name={scenario.personaName} size="sm" />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-signal text-paper"
                      : "bg-paper-dim text-ink"
                  }`}
                >
                  {message.text}
                </div>
                {message.role === "assistant" && mode === "text" && (
                  <button
                    type="button"
                    onClick={() => playAudio(index)}
                    aria-label="音声を再生"
                    className="shrink-0 text-ink-faint transition hover:text-signal"
                  >
                    ▶
                  </button>
                )}
              </div>
            ))}
          </div>

          {turnLimitReached && (
            <p className="px-5 text-sm font-medium text-signal">
              このセッションの会話上限に達しました。下のボタンでフィードバックを見てみましょう。
            </p>
          )}
          {error && <p className="px-5 text-sm text-rose">{error}</p>}

          <div className="border-t border-line-soft p-4">
            <div className="flex items-end gap-2">
              {mode === "realtime" && (
                <button
                  type="button"
                  onClick={handleMicMuteToggle}
                  disabled={turnLimitReached}
                  aria-label={micMuted ? "マイクのミュートを解除" : "マイクをミュート"}
                  className={`shrink-0 rounded-full px-3.5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    micMuted
                      ? "bg-rose-tint text-rose"
                      : "bg-paper-dim text-ink-soft hover:text-ink"
                  }`}
                >
                  {micMuted ? "ミュート中" : "話す"}
                </button>
              )}
              {mode === "text" && speechSupported && (
                <button
                  type="button"
                  onClick={handleMicToggle}
                  disabled={turnLimitReached}
                  aria-label={isRecording ? "録音を停止" : "音声入力を開始"}
                  className={`shrink-0 rounded-full px-3.5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isRecording
                      ? "bg-rose-tint text-rose"
                      : "bg-paper-dim text-ink-soft hover:text-ink"
                  }`}
                >
                  {isRecording ? "停止" : "音声入力"}
                </button>
              )}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={turnLimitReached}
                placeholder={
                  mode === "realtime"
                    ? "マイクで話すか、代わりにここに入力できます"
                    : speechSupported
                      ? "英語で入力するか、マイクで話してください"
                      : "英語で入力してください"
                }
                rows={1}
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-signal disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !inputText.trim() || turnLimitReached}
                className="shrink-0 rounded-full bg-signal px-5 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? "..." : "送信"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleEnd}
              disabled={turnCount < 1 || ending}
              className="mt-3 w-full rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ending ? "フィードバックを作成中..." : "会話を終えてフィードバックを見る"}
            </button>
          </div>
        </div>
      )}

      {phase === "ended" && feedback && (
        <div className="p-6 sm:p-8">
          <FeedbackPanel feedback={feedback} scenarioTitle={scenario.title} />

          <div className="mt-8 flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-full bg-signal px-6 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim"
            >
              もう一度話す
            </button>
            <Link
              href="/conversation"
              className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition hover:border-ink-faint"
            >
              他のシーンを見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
