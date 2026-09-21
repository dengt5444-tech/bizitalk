import { NativeModules } from "react-native";

// react-native-webrtc's native module isn't present in plain Expo Go (or
// any build that didn't compile it in) — importing the package at all
// throws immediately in that case ("WebRTC native module not found").
// Check for the native module first and only require() the package (and
// only from inside connectRealtimeVoice, never at module scope) once we
// know it's actually linked, mirroring the web app's own feature
// detection (RTCPeerConnection-in-window check) for the same reason: fall
// back to text mode instead of crashing.
export function isRealtimeVoiceSupported(): boolean {
  return NativeModules.WebRTCModule != null;
}

// A flagged speech segment shorter than this is treated as noise, not a
// real (if brief) reply — mirrors ../src/components/ConversationRoom.tsx.
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

// Requested immediately when the learner taps "start" — in parallel with
// creating the session and fetching the realtime token, rather than only
// once connectRealtimeVoice is reached — mirrors the web app's same
// start-time optimization (mic permission/device init is often the single
// slowest step). Explicit constraints (rather than plain `{ audio: true }`)
// so the AI's own voice is less likely to leak back into the mic and get
// misread by the server's turn detection as the learner speaking.
export function startMicStream(): Promise<MediaStream> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see file header
  const { mediaDevices } = require("react-native-webrtc");
  return mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

export type RealtimeCallbacks = {
  onUserSpeakingChange: (speaking: boolean) => void;
  onAssistantSpeakingChange: (speaking: boolean) => void;
  onAssistantTurn: (text: string, itemId?: string) => void;
  onUserTurn: (text: string, itemId?: string) => void;
  onConnectionUnstable: () => void;
};

export type RealtimeController = {
  sendText: (text: string) => void;
  setMuted: (muted: boolean) => void;
  disableFurtherInput: () => void;
  close: () => void;
};

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
    if (typeof part.transcript === "string" && part.transcript.trim()) return part.transcript.trim();
    if (typeof part.text === "string" && part.text.trim()) return part.text.trim();
  }
  return "";
}

// Mirrors ConversationRoom.tsx's connectRealtime() on the web almost line
// for line — same ephemeral-token endpoint, same SDP POST to OpenAI, same
// data-channel event names — just using react-native-webrtc's API instead
// of the browser's. See that file for the fuller protocol writeup.
export async function connectRealtimeVoice(
  clientSecretPromise: Promise<string>,
  openingLine: string,
  micStreamPromise: Promise<MediaStream>,
  callbacks: RealtimeCallbacks,
): Promise<RealtimeController> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see file header
  const { RTCPeerConnection, RTCSessionDescription } = require("react-native-webrtc");

  const pc = new RTCPeerConnection({});

  // The token fetch and the (already-in-flight, started at "start" time)
  // mic permission/device init run concurrently, so total setup time is
  // whichever of the two is slower, not their sum.
  const [clientSecret, micStream] = await Promise.all([clientSecretPromise, micStreamPromise]);
  micStream.getTracks().forEach((track: { enabled: boolean }) => pc.addTrack(track, micStream));

  const dc = pc.createDataChannel("oai-events");

  // Mirrors assistantSpeakingRef on the web — used for barge-in (see
  // speech_started below) and can't drift out of sync with the
  // on-screen "AI is speaking" indicator since it's driven by the exact
  // same transcript delta/done events.
  let assistantSpeaking = false;
  // input_audio_buffer.speech_started/stopped don't carry any content —
  // just "the learner started/stopped making sound" — and the realtime
  // transcription model is known to occasionally hallucinate a phantom
  // phrase from a brief noise blip instead of returning nothing. Tracking
  // how long the flagged "speech" actually lasted lets the
  // transcription-completed handler below discard implausibly short blips
  // instead of trusting the transcript blindly.
  let lastSpeechStartedAt: number | null = null;
  let lastSpeechDurationMs = 0;
  // Last assistant utterance, used to filter out the AI's own voice
  // leaking back into the mic and getting transcribed as if the learner
  // said it (see looksLikeSelfEcho above).
  let lastAssistantText = "";

  dc.onmessage = (event: { data: string }) => {
    let msg: RealtimeServerEvent;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case "input_audio_buffer.speech_started":
        callbacks.onUserSpeakingChange(true);
        lastSpeechStartedAt = Date.now();
        // Barge-in: the learner started talking while the AI still has a
        // response in flight. Cancel it immediately instead of letting it
        // run to completion and then auto-starting yet another turn —
        // that pile-up is what makes the conversation feel like it's
        // running away on its own.
        if (assistantSpeaking) {
          assistantSpeaking = false;
          callbacks.onAssistantSpeakingChange(false);
          try {
            dc.send(JSON.stringify({ type: "response.cancel" }));
          } catch {
            // ignore — worst case the current response finishes normally
          }
        }
        break;
      case "input_audio_buffer.speech_stopped":
        callbacks.onUserSpeakingChange(false);
        lastSpeechDurationMs = lastSpeechStartedAt ? Date.now() - lastSpeechStartedAt : 0;
        lastSpeechStartedAt = null;
        break;
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        assistantSpeaking = true;
        callbacks.onAssistantSpeakingChange(true);
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        assistantSpeaking = false;
        callbacks.onAssistantSpeakingChange(false);
        if (typeof msg.transcript === "string") {
          const text = msg.transcript.trim();
          lastAssistantText = text;
          callbacks.onAssistantTurn(text, msg.item_id);
        }
        break;
      case "conversation.item.input_audio_transcription.completed": {
        // A very short flagged "speech" segment is much more likely to be
        // a noise blip that the transcription model hallucinated text for
        // than a real word — discard it instead of letting it silently
        // turn into a fake conversation turn the AI then replies to.
        if (typeof msg.transcript !== "string" || lastSpeechDurationMs < MIN_SPEECH_DURATION_MS) {
          break;
        }
        const candidate = msg.transcript.trim();
        if (lastAssistantText && looksLikeSelfEcho(candidate, lastAssistantText)) {
          break;
        }
        callbacks.onUserTurn(candidate, msg.item_id);
        break;
      }
      case "conversation.item.done":
        if (msg.item?.role === "assistant") {
          const text = extractItemText(msg.item);
          if (text) lastAssistantText = text;
          callbacks.onAssistantTurn(text, msg.item?.id);
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
            instructions: `Say this exact line out loud as your opening, naturally, with nothing added before or after it: "${openingLine}"`,
          },
        }),
      );
    } catch {
      // ignore
    }
  };

  pc.oniceconnectionstatechange = () => {
    // "disconnected" is often transient (a brief wifi<->cellular handoff)
    // and can recover on its own — only "failed" means the session is
    // truly unusable and callers should fall back to text mode.
    if (pc.iceConnectionState === "failed") {
      callbacks.onConnectionUnstable();
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      "Content-Type": "application/sdp",
    },
  });

  if (!sdpRes.ok) {
    pc.close();
    micStream.getTracks().forEach((track: { stop: () => void }) => track.stop());
    throw new Error("sdp_exchange_failed");
  }

  const answerSdp = await sdpRes.text();
  await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));

  let inputDisabled = false;

  return {
    sendText(text: string) {
      if (dc.readyState !== "open") throw new Error("data_channel_not_open");
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
        }),
      );
      dc.send(JSON.stringify({ type: "response.create" }));
    },
    setMuted(muted: boolean) {
      micStream.getTracks().forEach((track: { enabled: boolean }) => (track.enabled = !muted));
    },
    disableFurtherInput() {
      if (inputDisabled) return;
      inputDisabled = true;
      micStream.getTracks().forEach((track: { enabled: boolean }) => (track.enabled = false));
      try {
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: { type: "realtime", audio: { input: { turn_detection: null } } },
          }),
        );
      } catch {
        // ignore — the UI already disables further input
      }
    },
    close() {
      try {
        dc.close();
      } catch {
        // connection may already be gone
      }
      try {
        micStream.getTracks().forEach((track: { stop: () => void }) => track.stop());
      } catch {
        // ignore
      }
      try {
        pc.close();
      } catch {
        // ignore
      }
    },
  };
}
