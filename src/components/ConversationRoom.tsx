"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lightbulb, Loader2, Mic, MicOff, Play, X } from "lucide-react";
import type {
  ConversationFeedback,
  ConversationTurn,
} from "@/lib/conversation";
import {
  CUSTOM_TOPIC_MAX_LENGTH,
  FREE_TALK_SLUG,
  MAX_TURNS_PER_SESSION,
  SUGGESTED_FEEDBACK_TURN,
} from "@/lib/conversation";
import { Avatar } from "@/components/Avatar";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { HintCard } from "@/components/conversation/HintCard";
import { VoiceOrb, type OrbState } from "@/components/conversation/VoiceOrb";

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

// A flagged speech segment shorter than this is treated as noise, not a
// real (if brief) reply — see the speech_started/stopped handling below.
const MIN_SPEECH_DURATION_MS = 450;

// Without headphones, the AI's own voice playing through the speakers can
// leak back into the mic even with echoCancellation on, get transcribed,
// and look exactly like the learner said it — which then makes the AI
// reply to itself and the conversation appears to run on its own. A
// transcript that's essentially a fragment of what the AI just said is
// almost certainly this echo, not real speech, so it's filtered out below
// rather than trusted as a genuine user turn.
function normalizeForEchoCheck(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'’‘“”\-–—()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeSelfEcho(candidate: string, lastAssistantText: string) {
  const a = normalizeForEchoCheck(candidate);
  const b = normalizeForEchoCheck(lastAssistantText);
  if (!a || !b) return false;
  if (b.includes(a)) return true;
  const aWords = a.split(" ");
  const bWords = new Set(b.split(" "));
  const overlap = aWords.filter((w) => bWords.has(w)).length;
  return aWords.length >= 3 && overlap / aWords.length >= 0.75;
}

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

export function ConversationRoom({
  scenario,
  isFreeTier = false,
}: {
  scenario: ScenarioInfo;
  // True for a signed-in user with no active subscription — the free
  // trial is a one-time grant (see FREE_TRIAL_MINUTES), so the moment
  // they see their scored feedback is exactly when the paid plans should
  // be pitched, not left for them to stumble onto /pricing later.
  isFreeTier?: boolean;
}) {
  const router = useRouter();
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

  // "Guided mode": after each of the AI's turns, offer a concrete example
  // of what the learner could say back — chosen on the start screen,
  // works in both realtime voice and text mode.
  const [guidedMode, setGuidedMode] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const guidedModeRef = useRef(false);
  // Bumped on every fetchHint call (and whenever the hint is cleared), so a
  // slow response that resolves after the learner already replied — or
  // after a newer hint request superseded it — can tell it's stale and
  // discard itself instead of popping up a suggestion for a turn that has
  // already passed.
  const hintRequestIdRef = useRef(0);

  useEffect(() => {
    guidedModeRef.current = guidedMode;
  }, [guidedMode]);

  // Mirrors `micMuted` for the same reason assistantSpeakingRef mirrors
  // assistantSpeaking: dc.onmessage is a closure from when the connection
  // was opened and never sees later state updates directly.
  const micMutedRef = useRef(false);
  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceTranscriptRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechSupported = useSyncExternalStore(
    noopSubscribe,
    getSpeechSupportedSnapshot,
    getSpeechSupportedServerSnapshot,
  );

  const transcriptRef = useRef<ConversationTurn[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  // dc.onmessage below is assigned once per WebRTC connection, inside a
  // closure rooted at the render that called handleStart — it never sees
  // later setSessionId() updates, so anything it needs (syncTranscript,
  // fetchHint) must read this ref instead of the sessionId state variable.
  const sessionIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  // Mirrors `assistantSpeaking` in a ref so dc.onmessage can read it
  // synchronously (state updates aren't visible mid-handler). Used for
  // barge-in: without this, when the learner starts talking over the AI,
  // nothing tells the model to stop — it keeps generating (and once done,
  // the server's turn detection immediately starts yet another response),
  // so the conversation just plows forward on its own instead of actually
  // listening. Driven by the transcript delta/done events specifically
  // (rather than a separate response.created/response.done-based flag)
  // because those are the same events already used for the on-screen
  // "AI is speaking" indicator, so this can't drift out of sync with what
  // the learner is actually seeing/hearing.
  const assistantSpeakingRef = useRef(false);
  // input_audio_buffer.speech_started/stopped don't carry any content —
  // just "the learner started/stopped making sound" — and the realtime
  // transcription model (Whisper-family) is known to occasionally
  // hallucinate a phantom phrase from a brief noise blip instead of
  // returning nothing. A hallucinated line then gets treated as a real
  // turn and the AI replies to it, which is what makes the conversation
  // look like it's continuing on its own even though the learner never
  // said anything. Tracking how long the flagged "speech" actually lasted
  // lets the transcription-completed handler below discard results for
  // implausibly short blips instead of trusting the transcript blindly.
  const lastSpeechStartedAtRef = useRef<number | null>(null);
  const lastSpeechDurationMsRef = useRef(0);
  // Disabling the mic track while the AI speaks (syncMicEnabled) isn't
  // instantaneous — there's an unavoidable gap between the server deciding
  // to start a new response and this client receiving that event and
  // actually flipping the track off, during which the still-live mic can
  // still pick up the very first instant of the AI's own new utterance.
  // That fragment has nothing to compare against yet in looksLikeSelfEcho
  // (the assistant turn it's an echo OF hasn't finished — and so hasn't
  // been recorded — at the time it's being said), so it can slip past both
  // the duration and echo checks and get treated as a genuine reply,
  // firing a second response.create while the first response is still
  // actively generating and cutting it off. Recording whether the AI was
  // already speaking the instant this speech began closes that gap: it
  // doesn't need to resemble anything to be rejected, the timing alone is
  // disqualifying.
  const speechOverlappedAssistantRef = useRef(false);
  // A reported "sniffling makes it stop" turned out to be a real gap: a
  // response can stream its audio transcript across more than one item
  // (a delta/done cycle per item, not one per response), so keying
  // assistantSpeakingRef off the transcript-level done event could flip it
  // false — and re-enable the mic — in a brief gap between items while the
  // AI was still actively replying overall. A stray sound in exactly that
  // gap (a sniffle, a breath) would then be picked up as a genuine turn
  // and fire a second response.create, cutting the reply off. The
  // response-level response.created/response.done events (see below)
  // bracket the AI's ENTIRE reply regardless of how many items it's split
  // into, so those are what actually gate the mic now. This timer is a
  // safety net for the response.done side specifically: if it never
  // arrives for some reason, the mic would otherwise stay disabled for
  // the rest of the session — far worse than the bug being fixed — so
  // this forces a recovery after a generous timeout instead.
  const responseSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const feedbackSuggested = turnCount >= SUGGESTED_FEEDBACK_TURN;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      closeRealtimeConnection();
    };
  }, []);

  // Keeps the realtime voice screen's transcript pinned to the newest line
  // as the conversation grows, the way any chat view should.
  useEffect(() => {
    const el = voiceTranscriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function closeRealtimeConnection() {
    if (responseSafetyTimerRef.current) {
      clearTimeout(responseSafetyTimerRef.current);
      responseSafetyTimerRef.current = null;
    }
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
    const id = sessionIdRef.current;
    if (!id) return Promise.resolve();
    return fetch(`/api/conversation/sessions/${id}/sync-transcript`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, turnCount: nextTurnCount }),
    }).catch(() => {
      // Best-effort background sync; the next successful sync will catch up.
    });
  }

  // Fetches a hint unconditionally — callers decide whether guided mode's
  // "auto-show after every turn" setting applies (see autoFetchHint below);
  // a learner tapping the on-demand hint button should always get one
  // regardless of that setting.
  async function fetchHint(transcript: ConversationTurn[]) {
    const id = sessionIdRef.current;
    if (!id) return;
    const requestId = ++hintRequestIdRef.current;
    setHintLoading(true);
    try {
      const res = await fetch(`/api/conversation/sessions/${id}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "hint_failed");
      // The learner may have already spoken again (or guided mode may have
      // been turned off) by the time this resolves — a newer request or an
      // explicit clear bumps the id, so an outdated response like this one
      // is dropped instead of popping up a suggestion for a turn that's
      // already over.
      if (requestId !== hintRequestIdRef.current) return;
      setHint({ reply: data.reply, gloss: data.gloss });
    } catch {
      // Silent — the hint card just stays empty/previous; guided mode is a
      // convenience, not something worth interrupting the conversation for.
    } finally {
      if (requestId === hintRequestIdRef.current) setHintLoading(false);
    }
  }

  // Used after each AI turn — only actually fetches when guided mode's
  // "show automatically" setting is on. The on-demand hint button calls
  // fetchHint directly instead, bypassing this gate.
  function autoFetchHint(transcript: ConversationTurn[]) {
    if (guidedModeRef.current) fetchHint(transcript);
  }

  function clearHint() {
    hintRequestIdRef.current += 1;
    setHint(null);
    setHintLoading(false);
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
    if (role === "user") {
      clearHint();
    } else {
      autoFetchHint(next);
    }
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

  // The duration/echo checks on the transcript catch most noise and echo
  // after the fact, but they can't catch everything — real room acoustics
  // can clip or distort the AI's own voice enough that it no longer reads
  // as an obvious fragment of what it just said, and it can easily last
  // longer than the short-blip threshold. The reliable fix is to stop the
  // mic from picking up the AI's voice in the first place: disable the mic
  // track for the whole time the AI is actually speaking, and only
  // re-enable it once the AI has finished — unless the learner has it
  // manually muted (or it was force-muted at the turn limit), in which
  // case it stays off regardless.
  function syncMicEnabled() {
    const stream = micStreamRef.current;
    if (!stream) return;
    const shouldBeEnabled = !micMutedRef.current && !assistantSpeakingRef.current;
    stream.getTracks().forEach((track) => (track.enabled = shouldBeEnabled));
  }

  // Brackets the AI's whole reply (response.created → response.done), not
  // any single item within it — see the comment on responseSafetyTimerRef
  // for why item-level events aren't safe to gate the mic on. The timeout
  // is a recovery path in case response.done never arrives for some
  // reason; ordinary replies are a few short sentences, so 20s is already
  // generous, and firing it just re-enables the mic a little early rather
  // than breaking anything.
  function beginAssistantResponse() {
    assistantSpeakingRef.current = true;
    setAssistantSpeaking(true);
    syncMicEnabled();
    if (responseSafetyTimerRef.current) clearTimeout(responseSafetyTimerRef.current);
    responseSafetyTimerRef.current = setTimeout(() => {
      responseSafetyTimerRef.current = null;
      if (!assistantSpeakingRef.current) return;
      Sentry.captureMessage("realtime voice: response.done never arrived", {
        level: "warning",
      });
      endAssistantResponse();
    }, 20000);
  }

  function endAssistantResponse() {
    if (responseSafetyTimerRef.current) {
      clearTimeout(responseSafetyTimerRef.current);
      responseSafetyTimerRef.current = null;
    }
    assistantSpeakingRef.current = false;
    setAssistantSpeaking(false);
    syncMicEnabled();
  }

  // Every place that asks the model for a reply goes through this instead
  // of sending response.create directly — the round trip to the server's
  // own response.created acknowledgment (previously what gated the mic)
  // is itself an unprotected window; disabling the mic on our own intent
  // to get a response, before the request even goes out, closes it.
  function sendResponseCreate(extra?: Record<string, unknown>) {
    beginAssistantResponse();
    dcRef.current?.send(JSON.stringify({ type: "response.create", ...extra }));
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

  async function connectRealtime(id: string, micStreamPromise: Promise<MediaStream>) {
    // Fetching the ephemeral token and waiting for the (already-in-flight,
    // see handleStart) mic permission/device init used to happen one after
    // the other — now they run concurrently, so total setup time is
    // whichever of the two is slower, not their sum.
    const tokenPromise = fetch(`/api/conversation/sessions/${id}/realtime-token`, {
      method: "POST",
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "token_failed");
      return data;
    });

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (audioRef.current) {
        audioRef.current.src = "";
        audioRef.current.srcObject = event.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };

    const [tokenData, micStream] = await Promise.all([tokenPromise, micStreamPromise]);

    micStreamRef.current = micStream;
    // The mic defaults to enabled the instant getUserMedia resolves — well
    // before dc.onopen fires and asks for the opening line, let alone
    // before the server's response.created ack for it comes back. Locking
    // it off right here, immediately, closes that startup window instead
    // of leaving it open until the first response-lifecycle event arrives;
    // beginAssistantResponse (called for real once the opening line's
    // response.create actually goes out) just re-confirms the same state.
    assistantSpeakingRef.current = true;
    syncMicEnabled();
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
          lastSpeechStartedAtRef.current = Date.now();
          speechOverlappedAssistantRef.current = assistantSpeakingRef.current;
          // No barge-in cancel here anymore — the mic is already disabled
          // for the entire time the AI is speaking (see syncMicEnabled),
          // so this event should never fire during a genuine AI turn in
          // the first place. It used to also cancel the AI's in-flight
          // response the moment this fired, which was meant to let the
          // learner interrupt naturally, but with the mic already off
          // during AI speech that could no longer happen from real
          // speech — the only thing left that could still trigger it was
          // a false positive (residual mic bleed, noise), which is
          // exactly what was cutting the AI off mid-sentence for no
          // reason the learner could see.
          break;
        case "input_audio_buffer.speech_stopped":
          setUserSpeaking(false);
          lastSpeechDurationMsRef.current = lastSpeechStartedAtRef.current
            ? Date.now() - lastSpeechStartedAtRef.current
            : 0;
          lastSpeechStartedAtRef.current = null;
          break;
        case "response.created":
          // The authoritative "AI is speaking" signal — brackets the
          // whole reply regardless of how many items/parts it streams
          // across. See beginAssistantResponse and the comment on
          // responseSafetyTimerRef for why this replaced the item-level
          // transcript delta/done events for this purpose.
          beginAssistantResponse();
          break;
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
          // response.created already gates the mic; this is kept only as
          // a harmless, redundant nudge to the visible "AI speaking"
          // indicator in case created was somehow missed.
          setAssistantSpeaking(true);
          break;
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
          // No longer touches assistantSpeakingRef/the mic — a response
          // can have more than one of these, and it was re-enabling the
          // mic in the gap between them while the AI was still actively
          // replying overall (response.done below is what the reply's
          // end is actually keyed on now).
          if (typeof msg.transcript === "string") {
            appendRealtimeTurn("assistant", msg.transcript.trim(), msg.item_id);
          }
          break;
        case "response.done":
          endAssistantResponse();
          break;
        case "conversation.item.input_audio_transcription.completed": {
          // Automatic response generation is turned off server-side (see
          // realtime-token/route.ts) specifically so that a noise blip or
          // mic echo can never make the AI speak on its own — the model
          // only ever replies to a transcript that passes the checks
          // below, via the explicit response.create calls in this case.
          // A very short flagged "speech" segment is much more likely to
          // be a noise blip that the transcription model hallucinated text
          // for than a real word, and a transcript that's basically a
          // fragment of what the AI just said is almost certainly its own
          // voice leaking back into the mic — reject both rather than
          // trusting them.
          const candidate = typeof msg.transcript === "string" ? msg.transcript.trim() : "";
          const lastAssistantTurn = [...transcriptRef.current]
            .reverse()
            .find((turn) => turn.role === "assistant");
          const isEcho = !!(lastAssistantTurn && looksLikeSelfEcho(candidate, lastAssistantTurn.text));
          // Recorded for Sentry only — which of these actually fires in
          // practice is exactly the visibility this bug class has been
          // missing; guessing blind at the cause without it hasn't worked.
          const rejectReason = !candidate
            ? "empty"
            : lastSpeechDurationMsRef.current < MIN_SPEECH_DURATION_MS
              ? "too_short"
              : isEcho
                ? "self_echo"
                : speechOverlappedAssistantRef.current
                  ? "overlapped_assistant_start"
                  : assistantSpeakingRef.current
                    ? "assistant_still_speaking"
                    : null;
          const rejected = rejectReason !== null;

          if (rejected) {
            Sentry.addBreadcrumb({
              category: "realtime-voice",
              message: "rejected transcript",
              level: "info",
              data: { reason: rejectReason, durationMs: lastSpeechDurationMsRef.current },
            });
            if (rejectReason === "overlapped_assistant_start" || rejectReason === "assistant_still_speaking") {
              // This is the exact race this fix targets — the mic picking
              // up a fragment of the AI's own new turn before the mic-mute
              // catches up, which used to slip through and fire a second
              // response.create that cut the AI off mid-sentence. A real
              // captured event so it's possible to confirm from Sentry
              // whether that's still happening, not just guess from a
              // learner's description again.
              Sentry.captureMessage("realtime voice: rejected transcript overlapped assistant turn", {
                level: "warning",
                extra: { reason: rejectReason, candidate, durationMs: lastSpeechDurationMsRef.current },
              });
            }
            // The audio was still committed to the model's own conversation
            // history as an input item the instant speech_stopped fired,
            // before this transcript (and thus this rejection) was even
            // known — left alone, that noise/echo would still sit in the
            // context the next real reply is generated from. Deleting it
            // keeps the model's view of the conversation clean.
            if (msg.item_id) {
              try {
                dcRef.current?.send(
                  JSON.stringify({ type: "conversation.item.delete", item_id: msg.item_id }),
                );
              } catch {
                // ignore — worst case one stray item lingers in context
              }
            }
            break;
          }

          appendRealtimeTurn("user", candidate, msg.item_id);
          Sentry.addBreadcrumb({
            category: "realtime-voice",
            message: "response.create (validated user turn)",
            level: "info",
          });
          try {
            sendResponseCreate();
          } catch {
            setError("メッセージを送信できませんでした。もう一度お試しください。");
          }
          break;
        }
        case "conversation.item.done":
          // Fallback in case the dedicated transcript-done event above
          // isn't recognized; item ids keep this from double-adding.
          if (msg.item?.role === "assistant") {
            appendRealtimeTurn("assistant", extractItemText(msg.item), msg.item?.id);
          }
          break;
        case "error":
          console.error("realtime session error", msg);
          Sentry.captureMessage("realtime voice: server error event", {
            level: "warning",
            extra: { assistantSpeaking: assistantSpeakingRef.current, error: msg },
          });
          // An error can terminate the current response without a normal
          // response.done ever arriving — if that leaves assistantSpeakingRef
          // stuck true, the mic would stay disabled for the rest of the
          // session, so unconditionally recover here too.
          if (assistantSpeakingRef.current) endAssistantResponse();
          break;
        default:
          break;
      }
    };

    dc.onopen = () => {
      try {
        sendResponseCreate({
          response: {
            instructions: `Say this exact line out loud as your opening, naturally, with nothing added before or after it: "${scenario.openingLine}"`,
          },
        });
      } catch {
        // ignore
      }
    };

    pc.oniceconnectionstatechange = () => {
      Sentry.addBreadcrumb({
        category: "realtime-voice",
        message: "ice connection state change",
        level: "info",
        data: { state: pc.iceConnectionState, assistantSpeaking: assistantSpeakingRef.current },
      });
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        // A real captured event, not just a breadcrumb — this and the
        // "AI stopped speaking" reports have been hard to tell apart from
        // the learner's side, so this needs to actually show up in Sentry
        // on its own rather than only riding along with some later error.
        Sentry.captureMessage("realtime voice: ICE connection unstable", {
          level: "warning",
          extra: { state: pc.iceConnectionState, assistantSpeaking: assistantSpeakingRef.current },
        });
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
    clearHint();
    openingHandledRef.current = false;

    // Requested immediately — in parallel with creating the session below —
    // rather than only after the session exists. getUserMedia doesn't
    // depend on the session at all, and the permission prompt (or just
    // device init, even when already granted) is often the single slowest
    // step in starting a voice call, so overlapping it with the network
    // round trip instead of paying for both back-to-back noticeably cuts
    // the wait before the learner can actually start talking. A no-op
    // .catch() here only silences the "unhandled rejection" console warning
    // that a denied/failed permission would otherwise log before
    // connectRealtime gets a chance to await (and properly handle) it below.
    const micStreamPromise: Promise<MediaStream> | null =
      chosenMode === "realtime"
        ? navigator.mediaDevices.getUserMedia({
            // Explicit (rather than relying on browser defaults) so the
            // AI's own voice playing through the speakers is less likely to
            // leak back into the mic and get misread by the server's turn
            // detection as the learner speaking.
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          })
        : null;
    micStreamPromise?.catch(() => {});

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
      sessionIdRef.current = data.sessionId;
      transcriptRef.current = data.transcript;
      setMessages(data.transcript);
      setTurnCount(0);
      autoFetchHint(data.transcript);

      if (chosenMode === "realtime") {
        setPhase("connecting");
        try {
          await connectRealtime(data.sessionId, micStreamPromise!);
          setPhase("chatting");
        } catch {
          closeRealtimeConnection();
          setMode("text");
          setError("リアルタイム音声に接続できなかったため、テキストモードで開始します。");
          setPhase("chatting");
          if (autoPlay) playAudio(0);
        }
      } else {
        setPhase("chatting");
        if (autoPlay) playAudio(0);
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
    // In voice mode, this is the type-instead-of-speak fallback — typing a
    // message while the AI is still talking would send a second
    // response.create while the first is still actively generating and
    // cut it off (see speechOverlappedAssistantRef above for the same
    // failure mode via the mic instead of the keyboard). The input is
    // already disabled while assistantSpeaking for this same reason; this
    // is a second guard against enqueued send() calls beating that.
    if (mode === "realtime" && assistantSpeakingRef.current) return;

    setInputText("");
    setError(null);
    clearHint();

    if (mode === "realtime" && dcRef.current?.readyState === "open") {
      pushTurn({ role: "user", text });
      try {
        dcRef.current.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
          }),
        );
        sendResponseCreate();
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

      const next = pushTurn({ role: "assistant", text: data.reply });
      setTurnCount(data.turnCount);
      autoFetchHint(next);
      if (autoPlay) {
        playAudio(data.assistantIndex);
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

      if (!data.feedback) {
        // Left before saying anything — there's no transcript to give
        // feedback on, so this is a clean exit rather than a completed
        // session: back to the scene list instead of a feedback panel
        // with nothing in it.
        router.push("/conversation");
        return;
      }

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
    sessionIdRef.current = null;
    setPhase("idle");
    setMode(null);
    setSessionId(null);
    setMessages([]);
    setTurnCount(0);
    setFeedback(null);
    setError(null);
    setMicMuted(false);
    clearHint();
  }

  const showVoiceScreen = mode === "realtime" && (phase === "connecting" || phase === "chatting");
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

  return (
    <>
    <div className="rounded-3xl bg-surface shadow-elevated">
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
          <button
            type="button"
            onClick={() => setGuidedMode((v) => !v)}
            aria-pressed={guidedMode}
            className={`mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition ${
              guidedMode
                ? "border-signal bg-signal-tint text-signal-dim"
                : "border-line text-ink-soft hover:text-ink"
            }`}
          >
            <Lightbulb size={16} strokeWidth={2} />
            毎回ヒントを自動表示する
            {guidedMode && <Check size={15} strokeWidth={2.5} />}
          </button>
          <p className="mx-auto mt-2 max-w-sm text-xs text-ink-faint">
            {guidedMode
              ? "相手が話すたびに「こう言ってみましょう」という返答例が表示されます。"
              : "オフでも、会話中いつでもヒントボタンから返答例を呼び出せます。"}
          </p>
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

      {phase === "chatting" && mode === "text" && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
            <p className="text-xs font-medium text-ink-faint">
              ターン {turnCount}
            </p>
            <label className="flex items-center gap-1.5 text-xs text-ink-faint">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="rounded accent-signal"
              />
              音声を自動再生
            </label>
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
                {message.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => playAudio(index)}
                    aria-label="音声を再生"
                    className="shrink-0 text-ink-faint transition hover:text-signal"
                  >
                    <Play size={14} strokeWidth={2} fill="currentColor" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {(hint || hintLoading) && (
            <div className="px-5 pb-4">
              <HintCard reply={hint?.reply ?? null} gloss={hint?.gloss ?? null} loading={hintLoading} onRefresh={() => fetchHint(transcriptRef.current)} />
            </div>
          )}

          {turnLimitReached ? (
            <p className="px-5 text-sm font-medium text-signal">
              長い会話になりました。下のボタンでフィードバックを見てみましょう。
            </p>
          ) : (
            feedbackSuggested && (
              <p className="px-5 text-sm text-ink-soft">
                十分に話せていますね。もう少し続けても、いつでも下のボタンでフィードバックを見てもOKです。
              </p>
            )
          )}
          {error && <p className="px-5 text-sm text-rose">{error}</p>}

          <div className="border-t border-line-soft p-4">
            <div className="flex items-end gap-2">
              {speechSupported && (
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
                  speechSupported
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

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => fetchHint(transcriptRef.current)}
                disabled={hintLoading || turnLimitReached}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-ink-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Lightbulb size={15} strokeWidth={2} />
                ヒント
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={ending}
                className="w-full rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ending
                  ? "処理中..."
                  : turnCount < 1
                    ? "退室する"
                    : "会話を終えてフィードバックを見る"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "ended" && feedback && (
        <div className="p-6 sm:p-8">
          <FeedbackPanel feedback={feedback} scenarioTitle={scenario.title} sessionId={sessionId ?? undefined} />

          {isFreeTier && (
            <div className="mt-8 rounded-2xl bg-signal-tint p-5 text-center sm:p-6">
              <p className="font-display font-semibold text-ink">
                無料体験はここまでです
              </p>
              <p className="mt-1.5 text-sm text-ink-soft">
                プランにご登録いただくと、他のシーンも含めてもっと練習を続けられます。
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-block rounded-full bg-signal px-6 py-3 text-sm font-medium text-paper transition hover:bg-signal-dim"
              >
                料金プランを見る
              </Link>
            </div>
          )}

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

    {showVoiceScreen && (
      <div className="fixed inset-0 z-50 flex flex-col bg-paper">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
          <div className="flex items-center gap-3">
            <Avatar name={scenario.personaName} size="sm" />
            <div>
              <p className="font-display text-sm font-semibold text-ink">{scenario.personaName}</p>
              <p className="text-xs text-ink-faint">ターン {turnCount}</p>
            </div>
          </div>
          {guidedMode && (
            <span className="flex items-center gap-1.5 rounded-full bg-signal-tint px-3 py-1.5 text-xs font-medium text-signal-dim">
              <Lightbulb size={13} strokeWidth={2} />
              ガイド付き
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 px-6 pt-4">
          <VoiceOrb state={orbState} />
          {phase === "connecting" && (
            <p className="text-sm font-medium text-signal">
              {scenario.personaName}さんに接続しています...
            </p>
          )}
          {/* Full running transcript rather than only the latest line, so
              the learner can scroll back through what's already been said
              instead of losing it the moment the next turn arrives. */}
          <div
            ref={voiceTranscriptRef}
            className="w-full max-w-md flex-1 space-y-3 overflow-y-auto pb-2"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar name={scenario.personaName} size="sm" />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-signal text-paper"
                      : "bg-paper-dim text-ink"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md space-y-3 px-5 sm:px-8">
          {phase === "chatting" && (hint || hintLoading) && (
            <HintCard reply={hint?.reply ?? null} gloss={hint?.gloss ?? null} loading={hintLoading} onRefresh={() => fetchHint(transcriptRef.current)} />
          )}
          {turnLimitReached ? (
            <p className="text-center text-sm font-medium text-signal">
              長い会話になりました。下の丸いボタンでフィードバックを見てみましょう。
            </p>
          ) : (
            feedbackSuggested &&
            phase === "chatting" && (
              <p className="text-center text-sm text-ink-soft">
                十分に話せていますね。もう少し続けても、
                <button
                  type="button"
                  onClick={handleEnd}
                  disabled={ending}
                  className="font-medium text-signal underline decoration-signal/40 underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  いつでもフィードバックを見る
                </button>
                こともできます。
              </p>
            )
          )}
          {error && <p className="text-center text-sm text-rose">{error}</p>}
        </div>

        <div className="mx-auto flex w-full max-w-md items-center gap-2.5 px-5 py-5 sm:px-8 sm:pb-8">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={turnLimitReached || assistantSpeaking}
            placeholder="マイクで話すか、代わりにここに入力できます"
            className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-signal disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => fetchHint(transcriptRef.current)}
            disabled={hintLoading || turnLimitReached || phase !== "chatting"}
            aria-label="ヒントを見る"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-dim text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Lightbulb size={19} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={handleMicMuteToggle}
            disabled={turnLimitReached || phase !== "chatting"}
            aria-label={micMuted ? "マイクのミュートを解除" : "マイクをミュート"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
              micMuted ? "bg-rose-tint text-rose" : "bg-paper-dim text-ink-soft hover:text-ink"
            }`}
          >
            {micMuted ? <MicOff size={19} strokeWidth={2} /> : <Mic size={19} strokeWidth={2} />}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            disabled={ending}
            aria-label={
              ending ? "処理中..." : turnCount < 1 ? "退室する" : "会話を終える"
            }
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90 disabled:cursor-not-allowed ${
              ending ? "opacity-90" : "disabled:opacity-40"
            }`}
          >
            {ending ? (
              <Loader2 size={19} strokeWidth={2} className="animate-spin" />
            ) : (
              <X size={19} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    )}
    </>
  );
}
